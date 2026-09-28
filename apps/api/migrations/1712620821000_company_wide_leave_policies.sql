-- Up Migration
ALTER TABLE public.leave_policies
  ALTER COLUMN department_id DROP NOT NULL;

ALTER TABLE public.leave_policies
  DROP CONSTRAINT IF EXISTS unique_policy_per_type_year;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_policy_company_type_year
  ON public.leave_policies (leave_type_id, year)
  WHERE department_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_policy_department_type_year
  ON public.leave_policies (department_id, leave_type_id, year)
  WHERE department_id IS NOT NULL;

-- Down Migration
DROP INDEX IF EXISTS public.uq_leave_policy_department_type_year;
DROP INDEX IF EXISTS public.uq_leave_policy_company_type_year;

ALTER TABLE public.leave_policies
  ALTER COLUMN department_id SET NOT NULL;

ALTER TABLE public.leave_policies
  ADD CONSTRAINT unique_policy_per_type_year UNIQUE (leave_type_id, department_id, year);
