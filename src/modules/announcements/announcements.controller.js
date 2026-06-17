import { z } from 'zod';
import { sendSuccess } from '../../utils/respond.js';
import * as announcementsService from './announcements.service.js';
import { recordRequestActivity } from '../audit/audit.service.js';
import { resolveDepartmentScope } from '../department-scope/department-scope.service.js';

const announcementSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  expiry_date: z.string().date().nullable().optional(),
  target_department_id: z.string().uuid().nullable().optional(),
  target_designation_id: z.string().uuid().nullable().optional(),
  target_department_ids: z.array(z.string().uuid()).optional(),
  target_designation_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
});

const announcementPatchSchema = announcementSchema.partial();

function getRequestScope(req) {
  return resolveDepartmentScope({
    roleId: req.user.role_id,
    userId: req.user.user_id,
    employeeId: req.user.employee_id,
  });
}

export async function getAnnouncements(req, res, next) {
  try {
    const roleName = await announcementsService.getRoleName(req.user.role_id);
    const includeAll = req.query.all === true || req.query.all === 'true';
    const activeOnly = req.query.active !== 'false';
    const result = await announcementsService.listAnnouncements({
      activeOnly,
      roleName,
      all: includeAll,
      employeeId: req.user.employee_id,
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function createAnnouncement(req, res, next) {
  try {
    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: parsed.error.issues,
        },
      });
    }

    const scope = await getRequestScope(req);
    const result = await announcementsService.createAnnouncement({
      ...parsed.data,
      userId: req.user.user_id,
      scope,
    });
    await recordRequestActivity(req, {
      action: 'ANNOUNCEMENT_CREATED',
      entityType: 'announcements',
      entityId: result?.id || null,
      meta: { announcement_id: result?.id || null, title: result?.title || parsed.data.title },
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const parsed = announcementPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: parsed.error.issues,
        },
      });
    }

    const scope = await getRequestScope(req);
    const result = await announcementsService.updateAnnouncement(
      req.params.id,
      parsed.data,
      req.user.user_id,
      scope
    );
    await recordRequestActivity(req, {
      action: 'ANNOUNCEMENT_UPDATED',
      entityType: 'announcements',
      entityId: req.params.id,
      meta: { announcement_id: req.params.id, updated_fields: Object.keys(parsed.data) },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function markAnnouncementRead(req, res, next) {
  try {
    const result = await announcementsService.markAnnouncementRead(req.params.id, {
      userId: req.user.user_id,
      employeeId: req.user.employee_id,
    });

    await recordRequestActivity(req, {
      action: 'ANNOUNCEMENT_READ',
      entityType: 'announcement_read_receipts',
      entityId: result?.id || null,
      meta: {
        announcement_id: req.params.id,
        receipt_id: result?.id || null,
        employee_id: req.user.employee_id || null,
      },
    });

    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
