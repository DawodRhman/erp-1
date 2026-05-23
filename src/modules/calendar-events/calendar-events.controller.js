import { z } from 'zod';
import { sendSuccess } from '../../utils/respond.js';
import * as calendarEventsService from './calendar-events.service.js';

const eventBodySchema = z.object({
  type: z.string().min(1),
  date: z.string().min(8),
  title: z.string().min(1),
  visibility: z.enum(['all', 'hr', 'employee']),
});

const eventPatchSchema = eventBodySchema.partial();

export async function getCalendarEvents(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const { from, to, year, type, visibility, search, sort, order, all } = query;
    const includeAll = all === true || all === 'true';

    // Resolve date range: explicit from/to > year shortcut > all events > current year default
    let resolvedFrom = from;
    let resolvedTo = to;

    if (!from && !to) {
      if (year) {
        resolvedFrom = `${year}-01-01`;
        resolvedTo = `${year}-12-31`;
      } else if (!includeAll) {
        const currentYear = new Date().getFullYear();
        resolvedFrom = `${currentYear}-01-01`;
        resolvedTo = `${currentYear}-12-31`;
      }
    }

    const result = await calendarEventsService.getCalendarEvents({
      from: resolvedFrom,
      to: resolvedTo,
      type,
      visibility,
      search,
      sort: sort || 'date',
      order: order || 'asc',
      roleId: req.user.role_id,
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function createCalendarEvent(req, res, next) {
  try {
    const parsed = eventBodySchema.safeParse(req.body);
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

    const result = await calendarEventsService.createCalendarEvent(parsed.data, req.user.user_id);
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateCalendarEvent(req, res, next) {
  try {
    const parsed = eventPatchSchema.safeParse(req.body);
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

    const result = await calendarEventsService.updateCalendarEvent(
      req.params.id,
      parsed.data,
      req.user.user_id
    );
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
