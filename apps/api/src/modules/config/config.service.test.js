import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../utils/errors.js';

const query = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  default: { query },
  pool: { query },
}));

describe('config service', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('reads roles as a config entity without requiring an is_active column', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'role-id',
          department_id: null,
          role_name: 'employee',
          description: 'Employee',
        },
      ],
    });

    const { getEntityRecords } = await import('./config.service.js');
    const records = await getEntityRecords('roles', { isSuperAdminCaller: false });

    expect(records).toEqual([
      {
        id: 'role-id',
        department_id: null,
        role_name: 'employee',
        description: 'Employee',
      },
    ]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('FROM public.roles');
    expect(query.mock.calls[0][0]).not.toContain('is_active');
  });

  it('filters designations by department_id when provided', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'designation-id',
          title: 'Frontend Engineer',
          department_id: '11111111-1111-4111-8111-111111111111',
          is_active: true,
        },
      ],
    });

    const { getEntityRecords } = await import('./config.service.js');
    const records = await getEntityRecords('designations', {
      isSuperAdminCaller: false,
      filters: { department_id: '11111111-1111-4111-8111-111111111111' },
    });

    expect(records).toEqual([
      {
        id: 'designation-id',
        title: 'Frontend Engineer',
        department_id: '11111111-1111-4111-8111-111111111111',
        is_active: true,
      },
    ]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('FROM public.designations');
    expect(query.mock.calls[0][0]).toContain('department_id = $2');
    expect(query.mock.calls[0][1]).toEqual([
      false,
      '11111111-1111-4111-8111-111111111111',
    ]);
  });

  it('filters Pakistan locations by kind and province', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'location-id',
          kind: 'city',
          country: 'Pakistan',
          province: 'Punjab',
          name: 'Lahore',
          is_active: true,
        },
      ],
    });

    const { getEntityRecords } = await import('./config.service.js');
    const records = await getEntityRecords('locations', {
      isSuperAdminCaller: false,
      filters: { kind: 'city', province: 'Punjab' },
    });

    expect(records).toHaveLength(1);
    expect(query.mock.calls[0][0]).toContain('FROM public.employee_locations');
    expect(query.mock.calls[0][0]).toContain('kind = $2');
    expect(query.mock.calls[0][0]).toContain('province = $3');
    expect(query.mock.calls[0][1]).toEqual([false, 'city', 'Punjab']);
  });

  it('creates Pakistan location records and prevents duplicate active names', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'location-id',
            kind: 'town',
            country: 'Pakistan',
            province: 'Punjab',
            name: 'Johar Town',
            is_active: true,
          },
        ],
      });

    const { createEntityRecord } = await import('./config.service.js');
    const record = await createEntityRecord('locations', {
      kind: 'town',
      province: 'Punjab',
      name: 'Johar Town',
      is_active: true,
    });

    expect(record.name).toBe('Johar Town');
    expect(query.mock.calls[0][0]).toContain('LOWER(name) = LOWER($3)');
    expect(query.mock.calls[1][0]).toContain('INSERT INTO public.employee_locations');
    expect(query.mock.calls[1][1]).toEqual(['town', 'Pakistan', 'Punjab', 'Johar Town', true]);
  });

  it('sanitizes location records before inserting them', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'location-id',
            kind: 'city',
            country: 'Pakistan',
            province: 'Punjab',
            name: 'Sahiwal',
            is_active: true,
          },
        ],
      });

    const { createEntityRecord } = await import('./config.service.js');
    await createEntityRecord('locations', {
      kind: 'city',
      country: 'Germany',
      province: '  Punjab  ',
      name: '  Sahiwal  ',
    });

    expect(query.mock.calls[1][1]).toEqual(['city', 'Pakistan', 'Punjab', 'Sahiwal', true]);
  });

  it('rejects city district and town location records without a province', async () => {
    const { createEntityRecord } = await import('./config.service.js');

    await expect(
      createEntityRecord('locations', {
        kind: 'city',
        name: 'Sahiwal',
      })
    ).rejects.toMatchObject(
      new AppError(400, 'VALIDATION_ERROR', 'Province is mandatory for district, city, and town options.')
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects duplicate location records with a readable conflict error', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing-id' }] });

    const { createEntityRecord } = await import('./config.service.js');

    await expect(
      createEntityRecord('locations', {
        kind: 'town',
        province: 'Punjab',
        name: 'Johar Town',
      })
    ).rejects.toMatchObject(
      new AppError(409, 'CONFLICT', 'Location option already exists.')
    );
  });

  it('updates location records with the same sanitization and duplicate checks', async () => {
    query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'location-id',
            kind: 'district',
            country: 'Pakistan',
            province: 'Punjab',
            name: 'Old Hyderabad',
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'location-id',
            kind: 'district',
            country: 'Pakistan',
            province: 'Sindh',
            name: 'Hyderabad',
            is_active: true,
          },
        ],
      });

    const { updateEntityRecord } = await import('./config.service.js');
    const record = await updateEntityRecord('locations', 'location-id', {
      kind: 'district',
      country: 'Canada',
      province: '  Sindh  ',
      name: '  Hyderabad  ',
    });

    expect(record.name).toBe('Hyderabad');
    expect(query.mock.calls[0][0]).toContain('SELECT * FROM public.employee_locations WHERE id = $1');
    expect(query.mock.calls[1][0]).toContain('id <> $5');
    expect(query.mock.calls[2][0]).toContain('UPDATE public.employee_locations');
    expect(query.mock.calls[2][1]).toEqual(['district', 'Pakistan', 'Sindh', 'Hyderabad', true, 'location-id']);
  });

  it('can include inactive config records for management screens and orders active records first', async () => {
    query.mockResolvedValueOnce({
      rows: [
        { id: 'active-id', type_name: 'Full-time', is_active: true },
        { id: 'inactive-id', type_name: 'Legacy Contract', is_active: false },
      ],
    });

    const { getEntityRecords } = await import('./config.service.js');
    const records = await getEntityRecords('employment-types', {
      isSuperAdminCaller: false,
      includeInactive: true,
    });

    expect(records).toHaveLength(2);
    expect(query.mock.calls[0][0]).toContain('($1::boolean = true OR is_active = true)');
    expect(query.mock.calls[0][0]).toContain('ORDER BY is_active DESC');
    expect(query.mock.calls[0][1]).toEqual([true]);
  });
});
