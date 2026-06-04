# EMS Backend Agent Guide

Read this file before making backend changes in `C:\backend`. This file is backend-only. Frontend work lives in `C:\frontend-2`.

## Backend Workspace

- Backend root: `C:\backend`
- Frontend root: `C:\frontend-2`
- Backend entry point: `C:\backend\server.js`
- Express app: `C:\backend\src\app.js`
- Database config: `C:\backend\src\config\db.js`
- Feature modules: `C:\backend\src\modules`
- Shared schemas: `C:\backend\src\schemas`
- Migrations: `C:\backend\migrations`
- Seeds: `C:\backend\seeds`
- Tests: colocated as `*.test.js`

## How To Start Any Backend Task

1. Read this file fully.
2. Check current worktree state:
   - `git status --short`
3. Inspect the related module before editing:
   - route
   - controller
   - service
   - schema
   - migration
   - tests
4. Understand the request before code:
   - What endpoint or table is changing?
   - Which frontend screen depends on it?
   - Which role can call it?
   - What data must be validated, sanitized, inserted, updated, returned, or hidden?
   - What errors can happen?
5. Write/update tests first where practical.
6. Keep the change scoped. Do not refactor unrelated modules.
7. Never revert unrelated dirty files.
8. Run the right verification commands before saying the work is complete.

## Commands

- Start backend:
  - `npm start`
- Run all backend tests:
  - `npm.cmd test`
- Run focused tests:
  - `npm.cmd test -- src/modules/<module>/<file>.test.js`
- Create migration:
  - `npm.cmd run db:create <migration-name>`
- Apply migrations:
  - `npm.cmd run db:migrate`
- Check pending migrations:
  - `npm.cmd run db:check`
- Roll back one migration only when explicitly required:
  - `npm.cmd run db:rollback`
- Seed master data:
  - `npm.cmd run db:seed`

## Backend Architecture Pattern

Most modules should follow this shape:

- `src/modules/<module>/<module>.routes.js`
  - Express router.
  - Auth middleware.
  - Permission middleware.
  - Query/body/params validation middleware when using shared schemas.
- `src/modules/<module>/<module>.controller.js`
  - HTTP request parsing.
  - Zod validation if not handled by middleware.
  - Calls service.
  - Returns `sendSuccess`.
  - Converts validation failures to `422`.
- `src/modules/<module>/<module>.service.js`
  - Business rules.
  - SQL queries.
  - Permission-sensitive filtering.
  - Duplicate checks.
  - Service-level validation for important invariants.
  - Throws `AppError` for expected failures.
- `src/modules/<module>/<module>.schema.js` or `src/schemas/<module>.schema.js`
  - Zod request/query/body schemas.
  - Transform/sanitize incoming values where appropriate.
- `src/modules/<module>/<module>.test.js`
  - Service tests for business logic and SQL shape.
  - Controller tests for validation and request/response behavior when needed.
- `migrations/<timestamp>_<name>.sql`
  - Database schema changes and seed data that must travel with schema.

## New Module SOP

When creating a new backend module, do this order:

1. Migration
   - Create required tables, constraints, indexes, triggers, and seed data.
   - Use `-- Up Migration` and `-- Down Migration`.
   - Add foreign keys for relationships.
   - Add unique constraints for duplicate prevention.
   - Add `CHECK` constraints for enum-like values.
   - Add `created_at` and `updated_at` when records are mutable.
   - Add `is_active` when records are configurable master data.
   - Add `updated_at` trigger if records are mutable.
2. Schema
   - Define Zod schemas for body, params, and query.
   - Validate enums, UUIDs, date strings, pagination, sort, and filters.
   - Trim strings.
   - Convert optional blank strings to `null` when database expects nullable.
   - Coerce numbers/booleans only where the API already expects query strings.
3. Service
   - Implement business logic.
   - Add duplicate checks before insert/update.
   - Add permission-sensitive filtering.
   - Do not trust the controller alone for important invariants.
   - Map expected database failures to `AppError`.
4. Controller
   - Parse and validate request data.
   - Call the service.
   - Return `sendSuccess(res, data, statusCode)`.
   - Return `422` for validation errors.
5. Routes
   - Add `verifyToken`.
   - Add `requirePermission`.
   - Add validation middleware where existing pattern uses it.
   - Mount route in `src/app.js`.
6. Tests
   - Add service tests.
   - Add controller tests for validation/error paths.
   - Add schema tests for complex validation.
7. Verify
   - `npm.cmd test`
   - `npm.cmd run db:check`
   - If migration was added, run `npm.cmd run db:migrate`, then `npm.cmd run db:check`.

## New Table SOP

Every new table should consider:

- Primary key:
  - Usually `uuid DEFAULT public.uuid_generate_v4()`.
- Foreign keys:
  - Reference real owner tables.
  - Pick delete behavior deliberately: `CASCADE`, `SET NULL`, or restrict.
- Constraints:
  - `NOT NULL` for mandatory data.
  - `UNIQUE` for natural duplicates.
  - `CHECK` for allowed statuses/types/kinds.
  - Date range check where needed, for example `end_date >= start_date`.
- Indexes:
  - Add indexes for foreign keys used in filters.
  - Add indexes for date range queries, status filters, and common joins.
- Timestamps:
  - `created_at timestamp without time zone DEFAULT now()`
  - `updated_at timestamp without time zone DEFAULT now()`
  - Trigger: `public.update_updated_at_column()`
- Soft activation:
  - Use `is_active boolean NOT NULL DEFAULT true` for master/config records.
- Seed data:
  - Put seed data in migration if required for app behavior.
  - Use `ON CONFLICT DO NOTHING` for idempotent seed inserts.
- Rollback:
  - `-- Down Migration` must remove triggers, constraints, indexes, and table/columns safely.

## Migration Rules

- Migration files live in `C:\backend\migrations`.
- Use names like:
  - `<timestamp>_<short_snake_case_name>.sql`
- Must contain:
  - `-- Up Migration`
  - SQL changes
  - `-- Down Migration`
  - rollback SQL
- Never edit an already-applied migration unless the user explicitly asks and understands the risk.
- Add a new migration for follow-up schema or seed changes.
- After adding a migration:
  - `npm.cmd run db:migrate`
  - `npm.cmd run db:check`
- If migration fails, fix the migration and rerun only after understanding the database state.

## Validation And Sanitization Rules

Validate at the boundary and protect important rules again in the service.

Controller/schema layer should:

- Reject malformed payloads with `422 VALIDATION_ERROR`.
- Trim all user-entered strings.
- Enforce max lengths that match database columns.
- Validate UUIDs with `z.string().uuid()`.
- Validate enums with `z.enum`.
- Validate date strings and date ranges.
- Validate query filters and sort columns.
- Normalize booleans from query strings where needed.
- Normalize optional blank strings to `null` if the database field is nullable.
- Use `mandatory` in user-facing validation messages, not `required`.

Service layer should:

- Never assume the controller already validated important business rules.
- Re-check invariants that protect data integrity.
- Force server-owned values where applicable:
  - `created_by`
  - `updated_by`
  - current user/employee scope
  - country fixed to `Pakistan` for employee locations
- Trim/sanitize values before insert/update when service can be called directly.
- Reject invalid state transitions.
- Reject duplicates before insert/update.
- Map database unique/check failures to readable `AppError`s.

## Error Handling Rules

Use `AppError` from `src/utils/errors.js` for expected failures.

Common errors:

- `400 BAD_REQUEST`
  - Invalid operation.
  - Missing meaningful payload.
  - Service-level validation failure.
- `401 INVALID_CREDENTIALS`
  - Auth failures only.
- `403 FORBIDDEN`
  - Authenticated user cannot access or mutate this resource.
- `404 NOT_FOUND`
  - Record does not exist or is not visible to the user.
- `409 CONFLICT`
  - Duplicate data.
  - Invalid state transition.
  - Business conflict such as insufficient balance.
- `422 VALIDATION_ERROR`
  - Request body/query/params failed schema validation.

Expected backend response shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": []
  }
}
```

Never leak:

- Raw SQL errors.
- Stack traces.
- Internal table names in user-facing messages.
- Password hashes.
- Tokens.
- Raw UUIDs when readable names are available.

Map database errors where possible:

- PostgreSQL `23505` unique violation:
  - throw `AppError(409, 'CONFLICT', '<friendly duplicate message>')`
- PostgreSQL `23514` check violation:
  - throw `AppError(400, 'VALIDATION_ERROR', '<friendly validation message>')`
- Foreign key violations:
  - throw a readable not-found or validation message depending on context.

## Auth And Permission Rules

- All protected routes must use `verifyToken`.
- Write routes must use `requirePermission`.
- Do not rely on frontend permissions for security.
- Employee self-service must be scoped to `req.user.employee_id`.
- HR/Super Admin list endpoints may see broader data only through backend permission checks.
- Never let a user access another employee's self-service data unless their role and permission explicitly allow it.

## SQL Rules

- Always parameterize values with `$1`, `$2`, etc.
- Never concatenate user input into SQL.
- Whitelist sort columns and sort directions.
- Normalize filters before building SQL.
- Use transactions for multi-table writes that must succeed or fail together.
- Use `RETURNING *` when the frontend needs the saved record.
- Prefer readable aliases in selects for frontend display fields.
- Never expose raw IDs when joined names are practical.

## Testing SOP

Add tests for every behavior change that affects:

- Validation.
- Sanitization.
- SQL filter behavior.
- Duplicate prevention.
- Permission scope.
- State transitions.
- Date ranges.
- Error mapping.
- Response shape.

Test types:

- Service tests:
  - Mock `pool.query`.
  - Assert SQL contains critical joins/filters/constraints.
  - Assert query params are ordered correctly.
  - Assert `AppError` for expected failures.
- Controller tests:
  - Assert `422` validation behavior.
  - Assert service not called on invalid input.
  - Assert successful controller calls pass sanitized data to service.
- Schema tests:
  - Assert transforms, trims, null normalization, enum checks, and date checks.

Before finishing backend work:

- Run focused tests first.
- Run `npm.cmd test`.
- Run `npm.cmd run db:check`.
- If migrations changed, run `npm.cmd run db:migrate`, then `npm.cmd run db:check`.

## Recent Backend Work That Is Working

Do not casually rewrite these areas. They are recent and verified.

### Leave Approved By

- `/api/leave-requests` now returns readable reviewer fallback data.
- HR and Super Admin should see readable Approved By values.
- Raw reviewer UUIDs should not be exposed to frontend display.

Files:

- `src/modules/leave/leave.service.js`
- `src/modules/leave/leave.service.test.js`

### Announcement And Calendar Multi-Targeting

- Announcements and Calendar Events support multiple department/designation targets.
- Employee visibility is filtered by department/designation on backend.
- Empty target arrays mean broad visibility:
  - no departments means all departments
  - no designations means all designations inside selected departments

Files:

- `migrations/1712620826000_multi_target_calendar_announcements.sql`
- `src/modules/announcements/announcements.controller.js`
- `src/modules/announcements/announcements.service.js`
- `src/modules/calendar-events/calendar-events.controller.js`
- `src/modules/calendar-events/calendar-events.service.js`

### Calendar Event Date Ranges

- Calendar Events support `start_date` and `end_date`.
- Old `date` column remains synced to `start_date` for compatibility.
- Calendar range filtering uses overlap logic:
  - event starts before requested end
  - event ends after requested start

Files:

- `migrations/1712620827000_calendar_event_date_ranges.sql`
- `src/modules/calendar-events/calendar-events.controller.js`
- `src/modules/calendar-events/calendar-events.service.js`
- `src/schemas/calendar-event.schema.js`

### Pakistan Employee Location Options

- Employee location options are backend-configured through `config/locations`.
- Country is Pakistan-only.
- Kinds are only:
  - `province`
  - `district`
  - `city`
  - `town`
- Province is mandatory for district/city/town.
- Province is null for province rows.
- Location names are trimmed.
- Duplicate locations are blocked case-insensitively.
- Employee address schema trims text and converts blank optional fields to null.
- Seed data exists for Pakistan provinces, common districts, cities, and towns/areas.

Files:

- `migrations/1712620828000_employee_location_options.sql`
- `migrations/1712620829000_employee_location_constraints.sql`
- `migrations/1712620830000_seed_pakistan_employee_locations.sql`
- `src/modules/config/config.controller.js`
- `src/modules/config/config.service.js`
- `src/modules/config/config.controller.test.js`
- `src/modules/config/config.service.test.js`
- `src/modules/employees/employees.schema.js`
- `src/modules/employees/employees.schema.test.js`

Verified:

- `npm.cmd test`
- `npm.cmd run db:migrate`
- `npm.cmd run db:check`

## Features Planned But Not Yet Implemented

### Department Head Role

- Add role and permissions.
- Store department/location scope.
- Apply backend scoping in employees, attendance, leave, and penalties.
- Allow penalty proposal only.
- Keep termination/firing/salary/account creation under HR/Super Admin.

### Bulk Employee Upload

- Add upload endpoint.
- Add CSV/XLSX template.
- Validate full file before writing.
- Return row-level errors.
- Use transaction and rollback on fatal errors.
- Support validate-only preview if requested.

## Final Response Rules For Backend Work

When backend work is done, report:

- What changed.
- Which files changed.
- Which migrations were added/applied.
- Which tests ran and passed.
- Whether `db:check` has no pending migrations.
- Anything not verified.

Keep the final response concise and do not repeat the whole project history.
