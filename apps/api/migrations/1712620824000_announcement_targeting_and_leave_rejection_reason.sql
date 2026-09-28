-- Up Migration
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_department_id uuid,
  ADD COLUMN IF NOT EXISTS target_designation_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcements_target_department_fkey'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_target_department_fkey
      FOREIGN KEY (target_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcements_target_designation_fkey'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_target_designation_fkey
      FOREIGN KEY (target_designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Down Migration
ALTER TABLE public.leave_requests
  DROP COLUMN IF EXISTS rejection_reason;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_target_designation_fkey,
  DROP CONSTRAINT IF EXISTS announcements_target_department_fkey,
  DROP COLUMN IF EXISTS target_designation_id,
  DROP COLUMN IF EXISTS target_department_id;
