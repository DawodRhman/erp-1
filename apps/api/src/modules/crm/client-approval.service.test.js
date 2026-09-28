import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn(), audit: vi.fn(), release: vi.fn() }));
vi.mock('../../config/db.js', () => ({ default: { query: mocks.query, connect: async () => ({ query: mocks.clientQuery, release: mocks.release }) } }));
vi.mock('../audit/audit.service.js', () => ({ recordActivityLog: mocks.audit }));
import { approvePublicQuotationByToken, rejectPublicQuotationByToken } from './crm.service.js';
const columns = ['client_approval_token', 'approved_at', 'client_approved_at', 'approval_remarks', 'updated_at'];
function setup(status = 'SENT') {
  mocks.query.mockResolvedValue({ rows: columns.map((column_name) => ({ column_name })) });
  mocks.clientQuery.mockImplementation(async (sql, params) => {
    if (sql.includes('SELECT *')) return { rows: [{ id: 'quote-1', status, quotation_number: 'QT-TEST' }] };
    if (sql.includes('UPDATE public.quotations')) return { rows: [{ id: 'quote-1', status: params[1], client_approved_at: '2026-09-18', approval_remarks: params[2] }] };
    return { rows: [] };
  });
}
beforeEach(() => { vi.clearAllMocks(); setup(); });
describe('client quotation decisions', () => {
  it('locks the row, saves approval and an audit in one transaction without exposing the token', async () => {
    const result = await approvePublicQuotationByToken('secret-token', { client_name: 'Client approver' });
    expect(result.status).toBe('APPROVED');
    expect(result).not.toHaveProperty('client_approval_token');
    expect(mocks.clientQuery.mock.calls[1][0]).toContain('FOR UPDATE');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'CLIENT_QUOTATION_APPROVED', db: expect.anything() }));
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('secret-token');
    expect(mocks.clientQuery).toHaveBeenLastCalledWith('COMMIT');
  });
  it('makes repeated approvals idempotent', async () => {
    setup('APPROVED');
    expect((await approvePublicQuotationByToken('secret-token')).status).toBe('APPROVED');
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it('cannot approve draft, expired or rejected quotations', async () => {
    for (const status of ['DRAFT', 'EXPIRED', 'REJECTED']) {
      setup(status);
      await expect(approvePublicQuotationByToken('secret-token')).rejects.toMatchObject({ code: 'QUOTATION_CLOSED' });
    }
  });
  it('cannot reject an already approved quotation', async () => {
    setup('APPROVED');
    await expect(rejectPublicQuotationByToken('secret-token', { reason: 'Changed my mind' })).rejects.toMatchObject({ code: 'QUOTATION_CLOSED' });
  });
  it('requires a rejection reason and saves valid rejections', async () => {
    await expect(rejectPublicQuotationByToken('secret-token')).rejects.toMatchObject({ code: 'REASON_MISSING' });
    expect((await rejectPublicQuotationByToken('secret-token', { reason: 'Revise quantity' })).status).toBe('REJECTED');
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'CLIENT_QUOTATION_REJECTED' }));
  });
  it('returns 404 for an invalid link and rolls back if audit persistence fails', async () => {
    mocks.clientQuery.mockImplementation(async () => ({ rows: [] }));
    await expect(approvePublicQuotationByToken('bad-token')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    setup(); mocks.audit.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(approvePublicQuotationByToken('secret-token')).rejects.toThrow('audit unavailable');
    expect(mocks.clientQuery).toHaveBeenLastCalledWith('ROLLBACK');
  });
});
