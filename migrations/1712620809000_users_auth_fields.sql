-- Up Migration
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Down Migration
ALTER TABLE public.users
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS must_change_password;
