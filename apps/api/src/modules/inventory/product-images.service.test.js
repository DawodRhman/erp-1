import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdir = vi.hoisted(() => vi.fn());
const writeFile = vi.hoisted(() => vi.fn());
const readFile = vi.hoisted(() => vi.fn());
const recordActivityLog = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', () => ({ default: { mkdir, writeFile, readFile } }));
vi.mock('../audit/audit.service.js', () => ({ recordActivityLog }));

describe('product image storage', () => {
  beforeEach(() => {
    mkdir.mockReset().mockResolvedValue(undefined);
    writeFile.mockReset().mockResolvedValue(undefined);
    readFile.mockReset().mockResolvedValue(Buffer.from('image'));
    recordActivityLog.mockReset().mockResolvedValue(null);
  });

  it('stores an approved image type and returns an ERP image URL', async () => {
    const { storeProductImage } = await import('./product-images.service.js');
    const result = await storeProductImage({
      file: { mimetype: 'image/png', originalname: 'camera.png', size: 128, buffer: Buffer.from('image') },
      uploadedBy: 'user-1',
    });

    expect(result.url).toMatch(/^\/api\/inventory\/product-images\/[0-9a-f-]+\.png$/);
    expect(writeFile).toHaveBeenCalledOnce();
    expect(recordActivityLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'INVENTORY_PRODUCT_IMAGE_UPLOADED' }));
  });

  it('rejects unsupported files and unsafe filenames', async () => {
    const { readProductImage, storeProductImage } = await import('./product-images.service.js');
    await expect(storeProductImage({ file: { mimetype: 'image/svg+xml', originalname: 'bad.svg', buffer: Buffer.from('svg') } }))
      .rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' });
    await expect(readProductImage('../private.png')).rejects.toMatchObject({ code: 'INVALID_FILENAME' });
  });
});
