import { z } from 'zod';
import { AppError } from '../../utils/errors.js';
import { sendSuccess } from '../../utils/respond.js';
import { recordRequestActivity } from '../audit/audit.service.js';
import * as accountsService from './accounts.service.js';

const statusSchema = z.object({
  is_active: z.boolean(),
});

const credentialTemplateSchema = z.object({
  template: z.string().trim().min(1).max(2000),
});

function parseBody(schema, body) {
  const result = schema.safeParse(body || {});
  if (!result.success) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Validation failed.', result.error.issues);
  }
  return result.data;
}

export async function listAccounts(req, res, next) {
  try {
    const result = await accountsService.listAccounts();
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function updateAccountStatus(req, res, next) {
  try {
    const body = parseBody(statusSchema, req.body);
    const result = await accountsService.updateAccountStatus(req.params.accountId, body.is_active);
    await recordRequestActivity(req, {
      action: body.is_active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
      entityType: 'accounts',
      entityId: req.params.accountId,
      meta: { account_user_id: req.params.accountId, is_active: body.is_active },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function getCredentialTemplate(req, res, next) {
  try {
    const result = await accountsService.getCredentialTemplate();
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

export async function updateCredentialTemplate(req, res, next) {
  try {
    const body = parseBody(credentialTemplateSchema, req.body);
    const result = await accountsService.updateCredentialTemplate(body.template, req.user?.user_id || null);
    await recordRequestActivity(req, {
      action: 'CREDENTIAL_WHATSAPP_TEMPLATE_UPDATED',
      entityType: 'system_settings',
      entityId: 'credential_whatsapp_template',
      meta: { setting_key: 'credential_whatsapp_template' },
    });
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}
