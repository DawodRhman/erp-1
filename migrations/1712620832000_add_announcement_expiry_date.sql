-- Up Migration
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS expiry_date date;

-- Down Migration
ALTER TABLE public.announcements
  DROP COLUMN IF EXISTS expiry_date;
