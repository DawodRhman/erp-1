-- Up Migration
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

UPDATE public.calendar_events
SET
  start_date = COALESCE(start_date, date),
  end_date = COALESCE(end_date, date);

ALTER TABLE public.calendar_events
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendar_events_date_range_check'
      AND conrelid = 'public.calendar_events'::regclass
  ) THEN
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT calendar_events_date_range_check CHECK (end_date >= start_date);
  END IF;
END $$;

-- Down Migration
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_date_range_check;

ALTER TABLE public.calendar_events
  DROP COLUMN IF EXISTS end_date,
  DROP COLUMN IF EXISTS start_date;
