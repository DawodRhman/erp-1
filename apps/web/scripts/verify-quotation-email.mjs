import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(frontend, '../erp-1');
const moduleAt = (name) => import(pathToFileURL(path.join(backend, name)).href);
process.chdir(backend);
const { SMTPServer } = await moduleAt('node_modules/smtp-server/lib/smtp-server.js');
Object.assign(process.env, { NODE_ENV: 'test', SMTP_HOST: '127.0.0.1', SMTP_ALLOW_LOCAL: 'true',
  SMTP_SECURE: 'false', SMTP_FROM: 'qa-sender@example.test', SMTP_REPLY_TO: '' });
const messages = [];
let rejectRecipients = false;
const smtp = new SMTPServer({ disabledCommands: ['AUTH', 'STARTTLS'],
  onRcptTo(address, session, callback) { callback(rejectRecipients ? new Error('QA recipient rejection') : undefined); },
  onData(stream, session, callback) {
    let body = ''; stream.on('data', (chunk) => { body += chunk.toString(); });
    stream.on('end', () => { messages.push(body); callback(); });
  },
});
const quoteIds = [];
let customerId, browser, vite, apiServer, pool;
const close = (server) => new Promise((resolve) => server.close(resolve));
try {
  await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  process.env.SMTP_PORT = String(smtp.server.address().port);
  const { default: app } = await moduleAt('src/app.js');
  ({ default: pool } = await moduleAt('src/config/db.js'));
  apiServer = await new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const apiUrl = `http://127.0.0.1:${apiServer.address().port}`;
  process.chdir(frontend);
  vite = await createServer({ configFile: false, root: frontend, plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
    css: { postcss: path.join(frontend, 'postcss.config.js') },
    resolve: { alias: { '@': path.join(frontend, 'src') } },
    server: { host: '127.0.0.1', port: 8082, strictPort: true, proxy: { '/api': { target: apiUrl, changeOrigin: true } } },
  });
  await vite.listen();
  const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
  process.env.PUBLIC_APP_URL = base;
  const credentials = { email: process.env.QA_CSR_EMAIL || 'csr.officer@esspl.com.pk', password: process.env.QA_CSR_PASSWORD || 'CsrPass@123!' };
  const login = await fetch(`${apiUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
  const auth = await login.json(); assert.equal(login.status, 200, 'CSR login must succeed');
  const api = async (url, body, method = 'POST') => {
    const res = await fetch(`${apiUrl}/api${url}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.data.token}` },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = await res.json(); return { status: res.status, data: json.data, error: json.error };
  };
  const registered = await api('/crm/customers', { customer_name: `QA Email Approval ${Date.now()}`, email: 'qa-client@example.test', customer_type: 'Corporate' });
  assert.equal(registered.status, 201); customerId = registered.data.id;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const csr = await context.newPage();
  const uiErrors = []; csr.on('pageerror', (error) => uiErrors.push(error.message));
  await csr.goto(`${base}/login`);
  await csr.getByPlaceholder('you@company.com').click();
  await csr.getByPlaceholder('you@company.com').fill(credentials.email);
  await csr.getByPlaceholder('Enter password').click();
  await csr.getByPlaceholder('Enter password').fill(credentials.password);
  await csr.getByRole('button', { name: 'Sign In', exact: true }).click();
  await csr.waitForURL((url) => !url.pathname.endsWith('/login'));
  await csr.goto(`${base}/crm/quotations/new?customerId=${customerId}`);
  await csr.getByRole('button', { name: 'Add Custom Item' }).click();
  const row = csr.locator('tbody tr').filter({ has: csr.locator('input') }).first();
  await row.locator('input').nth(0).fill('QA Installation Service');
  await row.locator('input[type=number]').nth(1).fill('1500');
  const savedResponse = csr.waitForResponse((res) => res.url().endsWith('/api/crm/quotations') && res.request().method() === 'POST');
  await csr.getByRole('button', { name: 'Generate & Send' }).click();
  const savedHttp = await savedResponse;
  const saved = await savedHttp.json();
  assert.equal(saved.success, true, `Quotation save HTTP ${savedHttp.status()}: ${JSON.stringify(saved.error)}`);
  const sent = saved.data; quoteIds.push(sent.id);
  assert.equal(sent.email_delivery_status, 'SENT'); assert.equal(messages.length, 1);
  assert.ok(messages[0].includes('/client/quotations/')); assert.ok(messages[0].includes('QA Installation Service'));
  await csr.getByRole('status').filter({ hasText: 'Email submitted to qa-client@example.test' }).waitFor();
  const output = path.join(frontend, 'output/quotation-email'); await mkdir(output, { recursive: true });
  await csr.screenshot({ path: path.join(output, '01-email-sent.png'), fullPage: true });
  console.log('PASS: CSR clicked Generate & Send; actual SMTP captured items and approval link; PostgreSQL stored SENT/message ID.');

  const clientContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const client = await clientContext.newPage(); client.on('pageerror', (error) => uiErrors.push(error.message));
  await client.goto(`${base}/client/quotations/${sent.client_approval_token}`);
  await client.getByPlaceholder('Approver name').fill('QA Client Approver');
  await client.getByRole('button', { name: 'Approve Quotation' }).click();
  await client.getByText('This quotation is already approved.').waitFor();
  await client.screenshot({ path: path.join(output, '02-client-approved-mobile.png'), fullPage: true });
  await csr.getByRole('button', { name: 'Convert to Order' }).waitFor({ timeout: 20000 });
  const approved = (await pool.query('SELECT status, client_approved_at, approval_remarks FROM public.quotations WHERE id = $1', [sent.id])).rows[0];
  assert.equal(approved.status, 'APPROVED'); assert.ok(approved.client_approved_at); assert.equal(approved.approval_remarks, 'QA Client Approver');
  assert.equal((await api(`/crm/quotations/${sent.id}/send-email`)).status, 409);
  await csr.screenshot({ path: path.join(output, '03-crm-approved-auto-refresh.png'), fullPage: true });
  console.log('PASS: Client clicked approval on mobile without login; PostgreSQL/audit saved approval; CSR refreshed automatically.');

  const payload = { customer_id: customerId, status: 'SENT', tax_rate: 18, items: [{ description: 'QA retry service', quantity: 1, unit_price: 1000 }] };
  rejectRecipients = true;
  const failed = await api('/crm/quotations', payload); assert.equal(failed.status, 201); quoteIds.push(failed.data.id);
  assert.equal(failed.data.email_delivery_status, 'FAILED');
  rejectRecipients = false;
  await csr.goto(`${base}/crm/quotations/${failed.data.id}`);
  await csr.getByRole('button', { name: 'Retry Email' }).click();
  await csr.getByRole('status').filter({ hasText: 'Email submitted to qa-client@example.test' }).waitFor();
  assert.equal(messages.length, 2);
  // Missing setup is a manual-link workflow, not a user-facing red email failure.
  const smtpHost = process.env.SMTP_HOST;
  process.env.SMTP_HOST = '';
  const manual = await api('/crm/quotations', payload); quoteIds.push(manual.data.id);
  assert.equal(manual.data.email_error_code, 'SMTP_NOT_CONFIGURED');
  await csr.goto(`${base}/crm/quotations/${manual.data.id}`);
  const manualNotice = csr.getByRole('status').filter({ hasText: 'Share the client approval link manually.' });
  await manualNotice.waitFor();
  assert.equal(await csr.getByRole('button', { name: 'Retry Email' }).count(), 0);
  assert.equal(await manualNotice.evaluate((node) => getComputedStyle(node).color), 'rgb(71, 85, 105)');
  await csr.getByRole('button', { name: 'Copy Client Link' }).click();
  await csr.screenshot({ path: path.join(output, '04-manual-approval-link.png'), fullPage: true });
  await client.goto(`${base}/client/quotations/${manual.data.client_approval_token}`);
  await client.getByRole('button', { name: 'Approve Quotation' }).click();
  await client.getByText('This quotation is already approved.').waitFor();
  await csr.getByRole('button', { name: 'Convert to Order' }).waitFor({ timeout: 10000 });
  assert.equal((await pool.query('SELECT status FROM public.quotations WHERE id = $1', [manual.data.id])).rows[0].status, 'APPROVED');
  assert.equal(messages.length, 2);
  process.env.SMTP_HOST = smtpHost;
  console.log('PASS: Missing SMTP setup shows a neutral manual-link message with no retry; manual link approval saved and CRM refreshed.');
  await client.goto(`${base}/client/quotations/${failed.data.client_approval_token}`);
  await client.getByPlaceholder('Only required if rejecting').fill('Please revise the quantity.');
  await client.getByRole('button', { name: 'Reject Quotation' }).click();
  await client.getByText('This quotation is already rejected.').waitFor();
  assert.equal((await pool.query('SELECT status FROM public.quotations WHERE id = $1', [failed.data.id])).rows[0].status, 'REJECTED');
  const draft = await api('/crm/quotations', { ...payload, status: 'DRAFT' }); quoteIds.push(draft.data.id);
  assert.equal((await api(`/crm/public/quotations/${draft.data.client_approval_token}`, undefined, 'GET')).status, 409);
  assert.equal((await api(`/crm/public/quotations/${draft.data.client_approval_token}/approve`, {})).status, 409);
  assert.equal(messages.length, 2);
  const audit = await pool.query('SELECT action FROM public.activity_logs WHERE entity_id::text = ANY($1::text[])', [quoteIds]);
  for (const action of ['QUOTATION_EMAIL_SENT', 'QUOTATION_EMAIL_FAILED', 'CLIENT_QUOTATION_APPROVED', 'CLIENT_QUOTATION_REJECTED']) {
    assert.ok(audit.rows.some((row) => row.action === action), `Missing audit action ${action}`);
  }
  assert.deepEqual(uiErrors, []);
  console.log('PASS: SMTP failure persisted; Retry Email clicked successfully; rejection saved; drafts blocked; audit records verified; no browser page errors.');
  console.log(`Screenshots: ${output}`);
} catch (error) {
  console.error('INTEGRATION FAILURE:', error);
  throw error;
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (apiServer) await close(apiServer);
  await close(smtp);
  if (pool) {
    // Remove only the fixtures created by this run; immutable audit records stay intact.
    if (customerId) {
      const fixtures = await pool.query('SELECT id FROM public.quotations WHERE customer_id = $1', [customerId]);
      for (const fixture of fixtures.rows) if (!quoteIds.includes(fixture.id)) quoteIds.push(fixture.id);
    }
    if (quoteIds.length) {
      await pool.query('DELETE FROM public.crm_orders WHERE quotation_id = ANY($1::uuid[])', [quoteIds]);
      await pool.query('DELETE FROM public.quotation_items WHERE quotation_id = ANY($1::uuid[])', [quoteIds]);
      await pool.query('DELETE FROM public.quotations WHERE id = ANY($1::uuid[])', [quoteIds]);
    }
    if (customerId) await pool.query('DELETE FROM public.customers WHERE id = $1', [customerId]);
    await pool.end();
  }
}
