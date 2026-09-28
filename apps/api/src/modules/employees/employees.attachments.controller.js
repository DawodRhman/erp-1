import multer from 'multer';
import { sendSuccess } from '../../utils/respond.js';
import { listEmployeeAttachments, uploadEmployeeAttachment, downloadEmployeeAttachment } from './employees.attachments.service.js';
import { buildAuditRequestContext } from '../audit/audit.service.js';

export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function getEmployeeAttachments(req, res, next) {
  try {
    const result = await listEmployeeAttachments(req.params.employeeId);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function uploadAttachment(req, res, next) {
  try {
    const result = await uploadEmployeeAttachment({
      employeeId: req.params.employeeId,
      file: req.file,
      kind: req.body.kind,
      documentType: req.body.document_type,
      uploadedBy: req.user.user_id,
      requestContext: buildAuditRequestContext(req),
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function downloadAttachment(req, res, next) {
  try {
    const { buffer, originalFilename, mimeType } = await downloadEmployeeAttachment(
      req.params.employeeId,
      req.params.attachmentId
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalFilename}"`);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}
