-- Up Migration
ALTER TABLE public.designations
  ADD COLUMN IF NOT EXISTS department_id uuid;

ALTER TABLE public.designations
  ADD CONSTRAINT designations_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.departments(id);

CREATE INDEX IF NOT EXISTS idx_designations_department_id
  ON public.designations(department_id);

-- Down Migration
DROP INDEX IF EXISTS public.idx_designations_department_id;

ALTER TABLE public.designations
  DROP CONSTRAINT IF EXISTS designations_department_id_fkey;

ALTER TABLE public.designations
  DROP COLUMN IF EXISTS department_id;
