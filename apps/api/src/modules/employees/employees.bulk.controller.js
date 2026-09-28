import multer from 'multer';
import { sendSuccess } from '../../utils/respond.js';
import { AppError } from '../../utils/errors.js';
import { buildAuditRequestContext } from '../audit/audit.service.js';
import {
  buildEmployeeBulkTemplate,
  importBulkEmployees,
  validateEmployeeRows,
  validateEmployeeWorkbook,
} from './employees.bulk.service.js';

export const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx')
    ) {
      cb(null, true);
      return;
    }
    cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only .xlsx files are supported.'));
  },
});

export async function downloadBulkTemplate(_req, res, next) {
  try {
    const buffer = await buildEmployeeBulkTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employee-bulk-upload-template.xlsx"');
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    return next(error);
  }
}

export async function validateBulkEmployees(req, res, next) {
  try {
    if (!req.file?.buffer) {
      throw new AppError(400, 'FILE_MISSING', 'Excel file is mandatory.');
    }
    const result = await validateEmployeeWorkbook(req.file.buffer, req.user.user_id, buildAuditRequestContext(req));
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function revalidateBulkEmployeeRows(req, res, next) {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const normalizedRows = rows.map((row, index) => ({
      rowNumber: Number(row?.rowNumber) || index + 2,
      data: row?.data || {},
    }));
    const result = await validateEmployeeRows(normalizedRows);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function importBulkEmployeesController(req, res, next) {
  try {
    const result = await importBulkEmployees(req.body.rows || [], req.user.user_id, buildAuditRequestContext(req));
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}
