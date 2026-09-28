import multer from 'multer';
import { sendSuccess } from '../../utils/respond.js';
import { AppError } from '../../utils/errors.js';
import { buildAuditRequestContext } from '../audit/audit.service.js';
import { productImageMimeTypes, readProductImage, storeProductImage } from './product-images.service.js';

export const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!productImageMimeTypes.has(file.mimetype)) {
      const error = new Error('Product image must be a JPG, PNG or WebP file.');
      error.statusCode = 400;
      error.code = 'INVALID_FILE_TYPE';
      callback(error);
      return;
    }
    callback(null, true);
  },
});

export function receiveProductImage(req, res, next) {
  productImageUpload.single('image')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(400, 'FILE_TOO_LARGE', 'Product image must be 5 MB or smaller.'));
    }
    return next(error.statusCode ? error : new AppError(400, error.code || 'UPLOAD_FAILED', error.message || 'Product image could not be uploaded.'));
  });
}

export async function uploadProductImage(req, res, next) {
  try {
    const image = await storeProductImage({
      file: req.file,
      uploadedBy: req.user?.user_id,
      requestContext: buildAuditRequestContext(req),
    });
    sendSuccess(res, image, 201);
  } catch (error) {
    next(error);
  }
}

export async function getProductImage(req, res, next) {
  try {
    const image = await readProductImage(req.params.filename);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(image.buffer);
  } catch (error) {
    next(error);
  }
}
