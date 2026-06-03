import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../utils/errors.js';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
  pool: { query },
}));

describe('penalties service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('stores the rule amount snapshot when proposing a penalty', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'rule-id', name: 'Late Arrival', amount_pkr: '1500.00' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'penalty-id', applied_amount_pkr: '1500.00' }],
      })
      .mockResolvedValueOnce({ rows: [{ name: 'Ayesha Khan' }] })
      .mockResolvedValueOnce({ rows: [] });

    const { proposePenalty } = await import('./penalties.service.js');
    const created = await proposePenalty({
      employee_id: 'EMP001',
      rule_id: 'rule-id',
      date: '2026-05-24',
      reason: 'Checked in late',
      proposed_by: 'user-id',
    });

    expect(created).toEqual({ id: 'penalty-id', applied_amount_pkr: '1500.00' });
    expect(query.mock.calls[1][0]).toContain('applied_amount_pkr');
    expect(query.mock.calls[1][1]).toEqual([
      'EMP001',
      'rule-id',
      '2026-05-24',
      'Checked in late',
      'user-id',
      '1500.00',
    ]);
  });

  it('rejects duplicate penalty rule names', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-rule' }] });

    const { createPenaltyRule } = await import('./penalties.service.js');

    await expect(
      createPenaltyRule({
        name: 'Late Arrival',
        amount_pkr: 1500,
        type: 'flat',
        created_by: 'user-id',
      })
    ).rejects.toMatchObject(new AppError(409, 'CONFLICT', 'Penalty rule already exists.'));
  });

  it('only approves pending penalties', async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'penalty-id', status: 'rejected' }],
    });

    const { approvePenalty } = await import('./penalties.service.js');

    await expect(approvePenalty('penalty-id', 'reviewer-id')).rejects.toMatchObject(
      new AppError(409, 'INVALID_STATE', 'Only pending penalties can be approved.')
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not rewrite employee acknowledgement timestamp when already acknowledged', async () => {
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 'penalty-id',
          employee_id: 'EMP001',
          status: 'approved',
          employee_ack: true,
          employee_acked_at: '2026-05-24T10:00:00.000Z',
        },
      ],
    });

    const { acknowledgeEmployeePenalty } = await import('./penalties.service.js');
    const penalty = await acknowledgeEmployeePenalty('penalty-id', 'EMP001');

    expect(penalty.employee_ack).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns applied amount snapshots in penalty lists', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const { listPenalties } = await import('./penalties.service.js');
    await listPenalties();

    expect(query.mock.calls[0][0]).toContain('COALESCE(ep.applied_amount_pkr, pr.amount_pkr) AS amount_pkr');
  });

  it('can include inactive penalty rules for configuration management and orders active rules first', async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 'active-rule', name: 'Late Arrival', is_active: true },
        { id: 'inactive-rule', name: 'Old Rule', is_active: false },
      ],
    });

    const { getPenaltyRules } = await import('./penalties.service.js');
    const records = await getPenaltyRules(false, true);

    expect(records).toHaveLength(2);
    expect(query.mock.calls[0][0]).toContain('ORDER BY is_active DESC');
    expect(query.mock.calls[0][1]).toEqual([true]);
  });
});
