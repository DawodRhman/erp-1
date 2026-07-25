import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query, connect },
}));

async function loadService() {
  vi.resetModules();
  return import('./matrix.service.js');
}

describe('matrix service (Blueprint V2.1)', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
  });

  it('creates a sales lead with generated lead number', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'lead-1',
          lead_number: 'LEAD-100200',
          title: 'CCTV Installation Project',
          estimated_value: 500000,
          status: 'NEW',
        },
      ],
    });

    const service = await loadService();
    const lead = await service.createSalesLead({
      title: 'CCTV Installation Project',
      estimated_value: 500000,
    });

    expect(lead.title).toBe('CCTV Installation Project');
    expect(query.mock.calls[0][1][1]).toBe('CCTV Installation Project');
    expect(query.mock.calls[0][1][3]).toBe(500000);
  });

  it('verifies 4-digit OTP handshake and triggers technician visit fee incentive', async () => {
    const clientQuery = vi.fn();
    connect.mockResolvedValueOnce({
      query: clientQuery,
      release: vi.fn(),
    });

    // Mock sequence: BEGIN, select ticket, update ticket, insert visit fee, COMMIT
    clientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'tck-1', otp_code: '4821', assigned_technician_id: 'tech-1' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'tck-1', status: 'CLOSED', otp_verified: true }],
      })
      .mockResolvedValueOnce({ rows: [] }) // insert visit fee
      .mockResolvedValueOnce({}); // COMMIT

    const service = await loadService();
    const verified = await service.verifyCustomerOTPHandshake({
      ticket_id: 'tck-1',
      input_otp: '4821',
    });

    expect(verified.status).toBe('CLOSED');
    expect(clientQuery).toHaveBeenCalledTimes(5);
  });

  it('rejects verification if OTP input does not match', async () => {
    const clientQuery = vi.fn();
    connect.mockResolvedValueOnce({
      query: clientQuery,
      release: vi.fn(),
    });

    clientQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: 'tck-1', otp_code: '4821', assigned_technician_id: 'tech-1' }],
      });

    const service = await loadService();
    await expect(
      service.verifyCustomerOTPHandshake({
        ticket_id: 'tck-1',
        input_otp: '9999',
      })
    ).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
    });
  });
});
