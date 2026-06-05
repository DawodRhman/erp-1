import { z } from 'zod';
import { sendSuccess } from '../../utils/respond.js';
import { AppError } from '../../utils/errors.js';
import { recordRequestActivity } from '../audit/audit.service.js';
import {
  getEntityRecords,
  createEntityRecord,
  updateEntityRecord,
  isSuperAdmin,
} from './config.service.js';

const idSchema = z.object({ id: z.string().uuid() });
const booleanQuerySchema = z.preprocess((value) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean().optional());
const trimmedString = (max) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1).max(max)
  );
const optionalTrimmedString = (max) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  }, z.string().min(1).max(max).optional());
const pakistanCountrySchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.literal('Pakistan')
);
const configQuerySchema = z.object({
  department_id: z.string().uuid().optional(),
  kind: z.enum(['province', 'district', 'city', 'town']).optional(),
  country: pakistanCountrySchema.optional(),
  province: optionalTrimmedString(100),
  include_inactive: booleanQuerySchema,
});

const locationBaseSchema = z.object({
  kind: z.enum(['province', 'district', 'city', 'town']),
  country: pakistanCountrySchema.default('Pakistan').optional(),
  province: optionalTrimmedString(100).nullable(),
  name: trimmedString(120),
  is_active: z.boolean().optional(),
});

const withLocationRules = (schema) => schema.refine((data) => {
  if (!data.kind || data.kind === 'province') return true;
  return Boolean(data.province);
}, {
  message: 'Province is mandatory for district, city, and town options.',
  path: ['province'],
}).transform((data) => ({
  ...data,
  country: 'Pakistan',
  province: data.kind === 'province' ? null : data.province,
}));

const locationSchema = withLocationRules(locationBaseSchema);

const entitySchemaMap = {
  departments: z.object({
    department_code: z.string().min(1).optional(),
    department_name: z.string().min(1).optional(),
    parent_department_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
  }),
  designations: z.object({
    title: z.string().min(1),
    department_id: z.string().uuid(),
    is_active: z.boolean().optional(),
  }),
  'employment-types': z.object({ type_name: z.string().min(1), is_active: z.boolean().optional() }),
  'job-statuses': z.object({ status_name: z.string().min(1), is_active: z.boolean().optional() }),
  'work-modes': z.object({ mode_name: z.string().min(1), is_active: z.boolean().optional() }),
  'work-locations': z.object({ location_name: z.string().min(1), is_active: z.boolean().optional() }),
  shifts: z.object({
    name: z.string().min(1),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    late_after_minutes: z.number().int().nonnegative(),
    is_active: z.boolean().optional(),
  }),
  'leave-types': z.object({ name: z.string().min(1), is_active: z.boolean().optional() }),
  'leave-policies': z.object({
    department_id: z.string().uuid().nullable().optional(),
    leave_type_id: z.string().uuid(),
    days_allowed: z.number().int().nonnegative(),
    year: z.number().int().min(2000),
    is_active: z.boolean().optional(),
  }),
  'leave-capacity': z.object({
    department_id: z.string().uuid(),
    max_percent: z.number().int().min(1).max(100),
    is_active: z.boolean().optional(),
  }),
  'penalty-rules': z.object({
    name: z.string().min(1),
    amount_pkr: z.number().nonnegative(),
    type: z.enum(['flat', 'percentage']),
    is_active: z.boolean().optional(),
  }),
  'allowance-types': z.object({
    field_name: z.string().min(1).max(100),
    is_active: z.boolean().optional(),
  }),
  roles: z.object({
    department_id: z.string().uuid().optional().nullable(),
    role_name: z.string().min(1).max(100),
    description: z.string().optional().nullable(),
  }),
  locations: locationSchema,
};

function getEntitySchema(entity, isPatch = false) {
  const schema = entitySchemaMap[entity];
  if (!schema) {
    throw new AppError(404, 'NOT_FOUND', 'Config entity not found.');
  }
  if (entity === 'locations' && isPatch) {
    return withLocationRules(locationBaseSchema.partial());
  }
  return isPatch ? schema.partial() : schema;
}

export async function getConfigEntity(req, res, next) {
  try {
    const queryParse = configQuerySchema.safeParse(req.query);
    if (!queryParse.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: queryParse.error.issues,
        },
      });
    }

    const superAdmin = await isSuperAdmin(req.user.role_id);
    const records = await getEntityRecords(req.params.entity, {
      isSuperAdminCaller: superAdmin,
      includeInactive: queryParse.data.include_inactive === true,
      filters: queryParse.data,
    });
    return sendSuccess(res, records, 200);
  } catch (error) {
    return next(error);
  }
}

export async function createConfigEntity(req, res, next) {
  try {
    const schema = getEntitySchema(req.params.entity, false);
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: parse.error.issues,
        },
      });
    }

    const record = await createEntityRecord(req.params.entity, parse.data);
    await recordRequestActivity(req, {
      action: 'CONFIG_ENTITY_CREATED',
      entityType: 'config',
      entityId: record?.id || null,
      meta: { entity: req.params.entity, record_id: record?.id || null },
    });
    return sendSuccess(res, record, 201);
  } catch (error) {
    return next(error);
  }
}

export async function updateConfigEntity(req, res, next) {
  try {
    const idParse = idSchema.safeParse(req.params);
    if (!idParse.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: idParse.error.issues,
        },
      });
    }

    const schema = getEntitySchema(req.params.entity, true);
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: parse.error.issues,
        },
      });
    }

    const record = await updateEntityRecord(req.params.entity, req.params.id, parse.data);
    await recordRequestActivity(req, {
      action: 'CONFIG_ENTITY_UPDATED',
      entityType: 'config',
      entityId: req.params.id,
      meta: { entity: req.params.entity, record_id: req.params.id, updated_fields: Object.keys(parse.data) },
    });
    return sendSuccess(res, record, 200);
  } catch (error) {
    return next(error);
  }
}
