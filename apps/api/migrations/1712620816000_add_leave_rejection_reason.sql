-- Up Migration
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Down Migration
ALTER TABLE public.leave_requests
  DROP COLUMN IF EXISTS rejection_reason;
