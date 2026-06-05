import { z } from 'zod';
import { sendSuccess } from '../../utils/respond.js';
import * as notificationsService from './notifications.service.js';
import { recordRequestActivity } from '../audit/audit.service.js';

const createNotificationSchema = z
  .object({
    user_id: z.string().uuid().optional().nullable(),
    role: z.string().min(1).optional().nullable(),
    type: z.string().min(1),
    message: z.string().min(1),
  })
  .refine((payload) => Boolean(payload.user_id || payload.role), {
    message: 'Either user_id or role is required.',
    path: ['user_id'],
  });

export async function getMyNotifications(req, res, next) {
  try {
    const result = await notificationsService.getMyNotifications(req.user.user_id, req.user.role_id);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    const result = await notificationsService.markRead(req.params.id, req.user.user_id, req.user.role_id);
    await recordRequestActivity(req, {
      action: 'NOTIFICATION_MARKED_READ',
      entityType: 'notifications',
      entityId: req.params.id,
      meta: { notification_id: req.params.id },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function createNotification(req, res, next) {
  try {
    const parsed = createNotificationSchema.safeParse(req.body);
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

    const result = await notificationsService.createNotification({
      ...parsed.data,
      created_by: req.user.user_id,
    });
    await recordRequestActivity(req, {
      action: 'NOTIFICATION_CREATED',
      entityType: 'notifications',
      entityId: result?.id || null,
      meta: { notification_id: result?.id || null, target_user_id: parsed.data.user_id || null, target_role: parsed.data.role || null },
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}
