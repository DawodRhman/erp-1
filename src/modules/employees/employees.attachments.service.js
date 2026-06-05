import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { recordActivityLog } from '../audit/audit.service.js';

const uploadRoot = path.resolve('public', 'uploads', 'employees');
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function safeExt(filename = '') {
  const ext = path.extname(filename).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.docx'].includes(ext)) {
    return '';
  }
  return ext;
}

export async function listEmployeeAttachments(employeeId) {
  const result = await pool.query(
    `
      SELECT id, employee_id, kind, document_type, original_filename, file_path,
             mime_type, size_bytes, uploaded_by, created_at
      FROM public.employee_attachments
      WHERE employee_id = $1
      ORDER BY created_at DESC
    `,
    [employeeId]
  );
  return result.rows.map((row) => ({
    ...row,
    url: row.file_path.startsWith('/') ? row.file_path : `/${row.file_path}`,
  }));
}

export async function uploadEmployeeAttachment({ employeeId, file, kind = 'document', documentType, uploadedBy, requestContext = {} }) {
  if (!file) throw new AppError(400, 'FILE_MISSING', 'Attachment file is mandatory.');
  if (!['profile_photo', 'document'].includes(kind)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Attachment kind must be profile_photo or document.');
  }
  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Unsupported attachment file type.');
  }
  const ext = safeExt(file.originalname);
  if (!ext) throw new AppError(400, 'INVALID_FILE_TYPE', 'Unsupported attachment file extension.');

  const existing = await pool.query(`SELECT 1 FROM public.employee_info WHERE employee_id = $1 LIMIT 1`, [employeeId]);
  if (existing.rowCount === 0) throw new AppError(404, 'NOT_FOUND', 'Employee not found.');

  const folder = path.join(uploadRoot, employeeId, kind === 'profile_photo' ? 'profile' : 'documents');
  await fs.mkdir(folder, { recursive: true });
  const storedFilename = `${randomUUID()}${ext}`;
  const absolutePath = path.join(folder, storedFilename);
  await fs.writeFile(absolutePath, file.buffer);
  const publicPath = `/uploads/employees/${employeeId}/${kind === 'profile_photo' ? 'profile' : 'documents'}/${storedFilename}`;

  const result = await pool.query(
    `
      INSERT INTO public.employee_attachments (
        employee_id, kind, document_type, original_filename, stored_filename,
        file_path, mime_type, size_bytes, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      employeeId,
      kind,
      documentType || null,
      file.originalname,
      storedFilename,
      publicPath,
      file.mimetype,
      file.size,
      uploadedBy || null,
    ]
  );

  await recordActivityLog({
    userId: uploadedBy,
    action: kind === 'profile_photo' ? 'EMPLOYEE_PROFILE_PHOTO_UPLOADED' : 'EMPLOYEE_DOCUMENT_UPLOADED',
    entityType: 'employee_attachments',
    entityId: employeeId,
    meta: {
      attachment_id: result.rows[0].id,
      kind,
      document_type: documentType || null,
      original_filename: file.originalname,
      size_bytes: file.size,
    },
    requestContext,
    bestEffort: true,
  });

  return { ...result.rows[0], url: publicPath };
}
