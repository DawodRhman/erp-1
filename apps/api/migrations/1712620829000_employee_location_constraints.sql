-- Up Migration
UPDATE public.employee_locations
SET
  name = btrim(name),
  province = NULLIF(btrim(province), '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_locations_name_not_blank_check'
      AND conrelid = 'public.employee_locations'::regclass
  ) THEN
    ALTER TABLE public.employee_locations
      ADD CONSTRAINT employee_locations_name_not_blank_check CHECK (btrim(name) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_locations_province_required_check'
      AND conrelid = 'public.employee_locations'::regclass
  ) THEN
    ALTER TABLE public.employee_locations
      ADD CONSTRAINT employee_locations_province_required_check
      CHECK (
        kind = 'province'
        OR (province IS NOT NULL AND btrim(province) <> '')
      );
  END IF;
END $$;

-- Down Migration
ALTER TABLE public.employee_locations
  DROP CONSTRAINT IF EXISTS employee_locations_province_required_check;

ALTER TABLE public.employee_locations
  DROP CONSTRAINT IF EXISTS employee_locations_name_not_blank_check;
