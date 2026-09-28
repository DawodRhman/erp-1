import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(frontend, '../erp-1');
const output = path.join(frontend, 'output/finance-print');
const moduleAt = (name) => import(pathToFileURL(path.join(backend, name)).href);
let browser, vite, apiServer, pool;
const close = (server) => new Promise((resolve) => server.close(resolve));
try {
  process.chdir(backend);
  process.env.NODE_ENV = 'test';
  const { default: app } = await moduleAt('src/app.js');
  ({ default: pool } = await moduleAt('src/config/db.js'));
  apiServer = await new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const apiUrl = `http://127.0.0.1:${apiServer.address().port}`;
  process.chdir(frontend);
  vite = await createServer({ configFile: false, root: frontend, plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
    css: { postcss: path.join(frontend, 'postcss.config.js') }, resolve: { alias: { '@': path.join(frontend, 'src') } },
    server: { host: '127.0.0.1', port: 8082, strictPort: true, proxy: { '/api': { target: apiUrl, changeOrigin: true } } },
  });
  await vite.listen();
  const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/login`);
  await page.getByPlaceholder('you@company.com').click();
  await page.getByPlaceholder('you@company.com').fill(process.env.QA_FINANCE_EMAIL || 'finance.officer@esspl.com.pk');
  await page.getByPlaceholder('Enter password').click();
  await page.getByPlaceholder('Enter password').fill(process.env.QA_FINANCE_PASSWORD || 'FinancePass@123!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  await page.goto(`${base}/finance/invoices`);
  const row = page.locator('tbody tr').filter({ hasText: 'INV-2026-0020' });
  await row.waitFor();
  assert.equal(await page.locator('#finance-invoice-preview').count(), 0, 'Ledger must not embed invoice');
  await row.getByRole('link', { name: 'View', exact: true }).click();
  await page.getByText('Sale Tax Invoice', { exact: true }).waitFor();
  const invoiceId = page.url().split('/').pop();
  const before = (await pool.query('SELECT * FROM public.customer_invoices WHERE id = $1', [invoiceId])).rows[0];
  assert.ok(before);
  assert.ok(await page.locator('.hbl-sale-meta').innerText().then((text) => text.includes('Farhan Aviation')));
  assert.equal(await page.locator('.hbl-sale-table tbody tr').count(), 3, 'Exactly two items and total, no blank rows');
  assert.ok(!(await page.locator('.finance-signature').innerText()).match(/[0-9a-f]{8}-[0-9a-f-]{27}/i));
  await page.screenshot({ path: path.join(output, '01-invoice-desktop.png'), fullPage: true });
  console.log('PASS: Finance login; ledger View opens INV-2026-0020 separately; correct buyer, no blank rows or raw Prepared By UUID.');

  await page.evaluate(() => { window.print = () => { window.__printCalled = true; }; });
  await page.getByRole('button', { name: 'Print / Save PDF' }).click();
  await page.waitForFunction(() => window.__printCalled === true);
  await page.emulateMedia({ media: 'print' });
  const widths = await page.locator('.print-isolated-root').evaluate((root) => {
    const sheet = root.querySelector('.finance-invoice-sheet');
    const table = sheet.querySelector('table');
    const last = table.querySelector('thead th:last-child');
    return { sheet: sheet.getBoundingClientRect().width, table: table.getBoundingClientRect().width,
      right: last.getBoundingClientRect().right, sheetRight: sheet.getBoundingClientRect().right, overflow: sheet.scrollWidth > sheet.clientWidth + 2 };
  });
  assert.ok(!widths.overflow, JSON.stringify(widths));
  assert.ok(widths.right <= widths.sheetRight + 1, JSON.stringify(widths));
  await page.pdf({ path: path.join(output, 'INV-2026-0020-fixed.pdf'), printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({ media: 'screen' });
  console.log('PASS: Clicked Print; A4 layout has no right clipping; browser PDF generated with CSS page margins.');

  await page.goto(`${base}/finance/billing-approvals/${invoiceId}`);
  await page.getByRole('button', { name: 'View Invoice', exact: true }).waitFor();
  assert.equal(await page.locator('#finance-invoice-preview').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Approve & Generate Invoice' }).count(), 0);
  await page.getByRole('button', { name: 'View Invoice', exact: true }).click();
  await page.getByText('Sale Tax Invoice', { exact: true }).waitFor();
  assert.ok(page.url().endsWith(`/view/${invoiceId}`));
  await page.getByRole('link', { name: 'Monthly Summary', exact: true }).click();
  await page.locator('input[value="INV-2026-0020"]').waitFor();
  await page.screenshot({ path: path.join(output, '02-monthly-summary.png'), fullPage: true });
  const summaryRow = page.locator('tr').filter({ has: page.locator('input[value="INV-2026-0020"]') });
  assert.ok(Math.abs(Number(await summaryRow.locator('input[type="number"]').last().inputValue()) - 381141.03) < 0.01);
  assert.ok((await page.locator('.finance-invoice-header').innerText()).includes("Buyer's Name: Farhan Aviation"));
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await page.locator('input[value="INV-2026-0020"]').waitFor();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await (await download).saveAs(path.join(output, 'finance-summary-2026-09.csv'));
  console.log('PASS: Approved bill opens exact invoice; Monthly Summary contains INV-2026-0020 and PKR 381,141.03; filters and CSV export clicked.');

  await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true; }; });
  await page.getByRole('button', { name: 'Print Summary', exact: true }).click();
  await page.waitForFunction(() => window.__printCalled === true);
  await page.emulateMedia({ media: 'print' });
  assert.ok(await page.locator('.print-isolated-root .hbl-summary').evaluate((table) => table.scrollWidth <= table.clientWidth + 2));
  await page.pdf({ path: path.join(output, 'finance-summary-fixed.pdf'), printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({ media: 'screen' });
  console.log('PASS: Clicked summary Print; landscape A4 fits all summary columns.');

  await page.goto(`${base}/finance/invoices/view/${invoiceId}`);
  await page.getByText('Sale Tax Invoice', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 1);
  await page.screenshot({ path: path.join(output, '03-invoice-mobile.png'), fullPage: true });
  const mobile = await page.evaluate(() => ({ screen: innerWidth, width: document.documentElement.scrollWidth }));
  assert.ok(mobile.width <= mobile.screen + 1, JSON.stringify(mobile));
  await page.reload();
  await page.getByText('Sale Tax Invoice', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  const after = (await pool.query('SELECT * FROM public.customer_invoices WHERE id = $1', [invoiceId])).rows[0];
  assert.deepEqual(after, before, 'Read-only verification must not change the user invoice');
  console.log('PASS: Mobile page has no document-level horizontal overflow; refresh preserves invoice; zero browser page errors; original database invoice unchanged.');
  console.log(`Evidence: ${output}`);
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (apiServer) await close(apiServer);
  if (pool) await pool.end();
}
