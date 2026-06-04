-- Up Migration
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_department_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS target_designation_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE public.announcements
SET target_department_ids = ARRAY[target_department_id]
WHERE target_department_id IS NOT NULL
  AND cardinality(target_department_ids) = 0;

UPDATE public.announcements
SET target_designation_ids = ARRAY[target_designation_id]
WHERE target_designation_id IS NOT NULL
  AND cardinality(target_designation_ids) = 0;

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS target_department_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS target_designation_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Down Migration
ALTER TABLE public.calendar_events
  DROP COLUMN IF EXISTS target_designation_ids,
  DROP COLUMN IF EXISTS target_department_ids;

ALTER TABLE public.announcements
  DROP COLUMN IF EXISTS target_designation_ids,
  DROP COLUMN IF EXISTS target_department_ids;
