import { z } from 'zod';
import { sendSuccess } from '../../utils/respond.js';
import * as calendarEventsService from './calendar-events.service.js';
import { recordRequestActivity } from '../audit/audit.service.js';
import { resolveDepartmentScope } from '../department-scope/department-scope.service.js';

const eventBaseSchema = z.object({
  type: z.string().min(1),
  date: z.string().min(8).optional(),
  start_date: z.string().min(8).optional(),
  end_date: z.string().min(8).optional(),
  title: z.string().min(1),
  target_department_ids: z.array(z.string().uuid()).optional(),
  target_designation_ids: z.array(z.string().uuid()).optional(),
});

function validateDateRange(data) {
  const startDate = data.start_date || data.date;
  const endDate = data.end_date || startDate;
  return !startDate || !endDate || endDate >= startDate;
}

const eventBodySchema = eventBaseSchema.refine((data) => data.date || data.start_date, {
  message: 'Start date is mandatory.',
  path: ['start_date'],
}).refine(validateDateRange, {
  message: 'To date cannot be before from date.',
  path: ['end_date'],
});

const eventPatchSchema = eventBaseSchema.partial().refine(validateDateRange, {
  message: 'To date cannot be before from date.',
  path: ['end_date'],
});

function getRequestScope(req) {
  return resolveDepartmentScope({
    roleId: req.user.role_id,
    userId: req.user.user_id,
    employeeId: req.user.employee_id,
  });
}

export async function getCalendarEvents(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const { from, to, year, type, search, sort, order, all } = query;
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
      search,
      sort: sort || 'date',
      order: order || 'asc',
      roleId: req.user.role_id,
      employeeId: req.user.employee_id,
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

    const scope = await getRequestScope(req);
    const result = await calendarEventsService.createCalendarEvent(parsed.data, req.user.user_id, scope);
    await recordRequestActivity(req, {
      action: 'CALENDAR_EVENT_CREATED',
      entityType: 'calendar_events',
      entityId: result?.id || null,
      meta: { event_id: result?.id || null, title: result?.title || parsed.data.title },
    });
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

    const scope = await getRequestScope(req);
    const result = await calendarEventsService.updateCalendarEvent(
      req.params.id,
      parsed.data,
      req.user.user_id,
      scope
    );
    await recordRequestActivity(req, {
      action: 'CALENDAR_EVENT_UPDATED',
      entityType: 'calendar_events',
      entityId: req.params.id,
      meta: { event_id: req.params.id, updated_fields: Object.keys(parsed.data) },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
