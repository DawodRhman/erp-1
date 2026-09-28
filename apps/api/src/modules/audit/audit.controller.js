import { sendError, sendSuccess } from '../../utils/respond.js';
import * as auditService from './audit.service.js';

export async function getActivityLogs(req, res, next) {
  try {
    const isSuperAdmin = await auditService.isSuperAdminRole(req.user?.role_id);
    if (!isSuperAdmin) {
      return sendError(res, 'FORBIDDEN', 'Only Super Admin can view audit logs.', 403);
    }

    const result = await auditService.listActivityLogs({
      action: req.query.action,
      module: req.query.module,
      actor_user_id: req.query.actor_user_id,
      actor_employee_id: req.query.actor_employee_id,
      entity_id: req.query.entity_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
