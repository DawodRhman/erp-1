import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../utils/errors.js';
import { recordActivityLog } from '../audit/audit.service.js';

const uploadRoot = path.resolve('private', 'uploads', 'inventory', 'products');
const imageTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export const productImageMimeTypes = new Set(imageTypes.keys());

export async function storeProductImage({ file, uploadedBy, requestContext = {} }) {
  if (!file) throw new AppError(400, 'FILE_MISSING', 'Select a product image to upload.');
  const extension = imageTypes.get(file.mimetype);
  if (!extension) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Product image must be a JPG, PNG or WebP file.');
  }

  await fs.mkdir(uploadRoot, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await fs.writeFile(path.join(uploadRoot, filename), file.buffer);

  const result = {
    filename,
    original_filename: file.originalname,
    mime_type: file.mimetype,
    size_bytes: file.size,
    url: `/api/inventory/product-images/${filename}`,
  };

  await recordActivityLog({
    userId: uploadedBy,
    action: 'INVENTORY_PRODUCT_IMAGE_UPLOADED',
    entityType: 'products',
    meta: result,
    requestContext,
    bestEffort: true,
  });

  return result;
}

export async function readProductImage(filename) {
  if (!/^[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(String(filename || ''))) {
    throw new AppError(400, 'INVALID_FILENAME', 'Invalid product image filename.');
  }

  const absolutePath = path.resolve(uploadRoot, filename);
  if (path.dirname(absolutePath) !== uploadRoot) {
    throw new AppError(400, 'INVALID_FILENAME', 'Invalid product image filename.');
  }

  let buffer;
  try {
    buffer = await fs.readFile(absolutePath);
  } catch {
    throw new AppError(404, 'FILE_MISSING', 'Product image was not found.');
  }

  const extension = path.extname(filename).toLowerCase();
  const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  return { buffer, mimeType };
}
