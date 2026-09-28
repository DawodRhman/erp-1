import { SMTPServer } from 'smtp-server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn(), getQuote: vi.fn(), audit: vi.fn(), release: vi.fn() }));
vi.mock('../../config/db.js', () => ({ default: { query: mocks.query, connect: async () => ({ query: mocks.clientQuery, release: mocks.release }) } }));
vi.mock('./crm.service.js', () => ({ getQuotationById: mocks.getQuote }));
vi.mock('../audit/audit.service.js', () => ({ recordActivityLog: mocks.audit }));
import { quotationEmailMessage, quotationMailConfig, sendQuotationEmail } from './quotation-email.service.js';

const quote = { id: 'quote-1', quotation_number: 'QT-2026-TEST', status: 'SENT', customer_name: 'Test <Client>',
  customer_email: 'client@example.test', client_approval_token: 'private-token', subtotal: 100, tax_amount: 18,
  total_amount: 118, email_delivery_status: 'NOT_SENT', items: [{ description: 'Camera', quantity: 1, unit_price: 100 }] };
let server;
let captured;

async function smtp(reject = false) {
  captured = [];
  server = new SMTPServer({ disabledCommands: ['AUTH', 'STARTTLS'],
    onRcptTo(address, session, callback) { callback(reject ? new Error('Recipient rejected') : undefined); },
    onData(stream, session, callback) {
      let data = ''; stream.on('data', (chunk) => { data += chunk.toString(); });
      stream.on('end', () => { captured.push(data); callback(); });
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  vi.stubEnv('SMTP_HOST', '127.0.0.1');
  vi.stubEnv('SMTP_PORT', String(server.server.address().port));
  vi.stubEnv('SMTP_ALLOW_LOCAL', 'true');
  vi.stubEnv('SMTP_FROM', 'sender@example.test');
  vi.stubEnv('PUBLIC_APP_URL', 'http://localhost:8080');
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getQuote.mockResolvedValue({ ...quote });
  mocks.query.mockResolvedValue({ rows: [{ id: quote.id }] });
  mocks.clientQuery.mockResolvedValue({ rows: [] });
  mocks.audit.mockResolvedValue({ id: 'audit-1' });
  ['SMTP_HOST', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASS', 'SMTP_REPLY_TO', 'PUBLIC_APP_URL'].forEach((key) => vi.stubEnv(key, ''));
  vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('SMTP_SECURE', 'false'); vi.stubEnv('SMTP_ALLOW_LOCAL', 'false');
});
afterEach(async () => {
  if (server) { await new Promise((resolve) => server.close(resolve)); server = undefined; }
  vi.unstubAllEnvs();
});

describe('quotation SMTP delivery', () => {
  it('sends through a real local SMTP connection and records successful delivery/audit', async () => {
    await smtp();
    const result = await sendQuotationEmail(quote.id, { actorId: 'csr-user' });
    expect(result.email_delivery).toEqual({ status: 'SENT', recipient: quote.customer_email });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toContain('client@example.test');
    expect(captured[0]).toContain('/client/quotations/private-token');
    expect(captured[0]).toContain('QT-2026-TEST');
    expect(mocks.clientQuery.mock.calls.find(([sql]) => sql.includes('email_message_id'))[1]).toEqual([
      quote.id, 'SENT', quote.customer_email, expect.any(String), null, null,
    ]);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'QUOTATION_EMAIL_SENT', userId: 'csr-user' }));
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('private-token');
  });
  it('persists a failure when SMTP is missing instead of claiming success', async () => {
    const result = await sendQuotationEmail(quote.id);
    expect(result.email_delivery.status).toBe('FAILED');
    expect(result.email_delivery.message).toContain('not configured');
    expect(result.email_delivery.code).toBe('SMTP_NOT_CONFIGURED');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'QUOTATION_EMAIL_FAILED' }));
  });
  it('records recipient rejection and allows a later retry', async () => {
    await smtp(true);
    const result = await sendQuotationEmail(quote.id);
    expect(result.email_delivery.status).toBe('FAILED');
    expect(result.email_delivery.code).toBe('EMAIL_SEND_FAILED');
    expect(captured).toHaveLength(0);
  });
  it('does not send a duplicate for an idempotent create retry', async () => {
    mocks.getQuote.mockResolvedValue({ ...quote, email_delivery_status: 'SENT' });
    await sendQuotationEmail(quote.id);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('blocks concurrent sends', async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    await expect(sendQuotationEmail(quote.id, { resend: true })).rejects.toMatchObject({ code: 'EMAIL_IN_PROGRESS' });
  });
  it('cannot email a draft or an already approved quotation', async () => {
    for (const status of ['DRAFT', 'APPROVED']) {
      mocks.getQuote.mockResolvedValue({ ...quote, status });
      await expect(sendQuotationEmail(quote.id)).rejects.toMatchObject({ code: 'QUOTATION_NOT_SENDABLE' });
    }
  });
  it('escapes HTML, validates client email and rejects localhost URLs in production', () => {
    const config = { from: 'sender@example.test', baseUrl: 'https://erp.example.test' };
    expect(quotationEmailMessage(quote, config).html).toContain('Test &lt;Client&gt;');
    expect(() => quotationEmailMessage({ ...quote, customer_email: '' }, config)).toThrow('valid client email');
    expect(() => quotationMailConfig({ SMTP_HOST: 'smtp.example.test', SMTP_FROM: 'sender@example.test', SMTP_USER: 'sender',
      SMTP_PASS: 'secret', PUBLIC_APP_URL: 'http://localhost:8080', NODE_ENV: 'production', SMTP_ALLOW_LOCAL: 'true' })).toThrow('public HTTPS');
  });
});
