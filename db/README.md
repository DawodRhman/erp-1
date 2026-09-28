# Database workspace

The current executable migrations and seeds remain under `apps/api` during the
compatibility phase. They will move here module by module after schema ownership
and rollback behavior are verified.

- `migrations/` holds canonical schema migrations.
- `seeds/` holds idempotent reference and development seed data.
