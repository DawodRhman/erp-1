-- Up Migration
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS ack boolean NOT NULL DEFAULT false;

-- Down Migration
ALTER TABLE public.attendance
DROP COLUMN IF EXISTS ack;

