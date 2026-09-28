-- Up Migration
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_visibility_check,
  DROP COLUMN IF EXISTS visibility;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_audience_check,
  DROP COLUMN IF EXISTS audience;

-- Down Migration
ALTER TABLE public.calendar_events
  ADD COLUMN visibility character varying(20) DEFAULT 'all'::character varying NOT NULL,
  ADD CONSTRAINT calendar_events_visibility_check CHECK (((visibility)::text = ANY (ARRAY['all'::text, 'hr'::text, 'employee'::text])));

ALTER TABLE public.announcements
  ADD COLUMN audience character varying(20) DEFAULT 'all'::character varying NOT NULL,
  ADD CONSTRAINT announcements_audience_check CHECK (((audience)::text = ANY (ARRAY['all'::text, 'hr'::text, 'employee'::text])));
