import { z } from 'zod';
import { sendSuccess } from '../../utils/respond.js';
import * as announcementsService from './announcements.service.js';

const announcementSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  audience: z.enum(['all', 'hr', 'employee']).default('all'),
  target_department_id: z.string().uuid().nullable().optional(),
  target_designation_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

const announcementPatchSchema = announcementSchema.partial();

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

    const result = await announcementsService.createAnnouncement({
      ...parsed.data,
      userId: req.user.user_id,
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

    const result = await announcementsService.updateAnnouncement(
      req.params.id,
      parsed.data,
      req.user.user_id
    );
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
