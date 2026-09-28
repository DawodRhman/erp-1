import { beforeEach, describe, expect, it, vi } from 'vitest';

const createEntityRecord = vi.hoisted(() => vi.fn());
const getEntityRecords = vi.hoisted(() => vi.fn());
const updateEntityRecord = vi.hoisted(() => vi.fn());
const isSuperAdmin = vi.hoisted(() => vi.fn());

vi.mock('./config.service.js', () => ({
  createEntityRecord,
  getEntityRecords,
  updateEntityRecord,
  isSuperAdmin,
}));

function mockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('config controller', () => {
  beforeEach(() => {
    createEntityRecord.mockReset();
    getEntityRecords.mockReset();
    updateEntityRecord.mockReset();
    isSuperAdmin.mockReset();
  });

  it('rejects city location creation without a province before service call', async () => {
    const { createConfigEntity } = await import('./config.controller.js');
    const req = {
      params: { entity: 'locations' },
      body: { kind: 'city', country: 'Pakistan', name: 'Sahiwal' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await createConfigEntity(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
        }),
      })
    );
    expect(createEntityRecord).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-Pakistan location country values before service call', async () => {
    const { createConfigEntity } = await import('./config.controller.js');
    const req = {
      params: { entity: 'locations' },
      body: { kind: 'city', country: 'Germany', province: 'Punjab', name: 'Sahiwal' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await createConfigEntity(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(createEntityRecord).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('trims valid location creation payloads before service call', async () => {
    createEntityRecord.mockResolvedValueOnce({
      id: 'location-id',
      kind: 'city',
      country: 'Pakistan',
      province: 'Punjab',
      name: 'Sahiwal',
      is_active: true,
    });

    const { createConfigEntity } = await import('./config.controller.js');
    const req = {
      params: { entity: 'locations' },
      body: { kind: 'city', country: ' Pakistan ', province: ' Punjab ', name: ' Sahiwal ' },
    };
    const res = mockResponse();
    const next = vi.fn();

    await createConfigEntity(req, res, next);

    expect(createEntityRecord).toHaveBeenCalledWith('locations', {
      kind: 'city',
      country: 'Pakistan',
      province: 'Punjab',
      name: 'Sahiwal',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
