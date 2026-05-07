-- Up Migration
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS state varchar(20) NOT NULL DEFAULT 'draft'
    CONSTRAINT attendance_state_check CHECK (state IN ('draft','saved','submitted','locked','ho_unlocked')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlocked_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS unlock_reason text,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
ALTER TABLE public.attendance
  DROP COLUMN IF EXISTS unlocked_at,
  DROP COLUMN IF EXISTS unlock_reason,
  DROP COLUMN IF EXISTS unlocked_by,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS submitted_by,
  DROP COLUMN IF EXISTS state;
