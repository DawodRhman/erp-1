-- Up Migration
CREATE TABLE IF NOT EXISTS public.employee_career_movements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  employee_id character varying(10) NOT NULL,
  movement_type character varying(40) NOT NULL,
  effective_date date NOT NULL,
  previous_department_id uuid,
  previous_designation_id uuid,
  previous_work_location_id uuid,
  new_department_id uuid,
  new_designation_id uuid,
  new_work_location_id uuid,
  salary_revision_id uuid,
  reason text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_career_movements_pkey PRIMARY KEY (id),
  CONSTRAINT employee_career_movements_type_check CHECK (
    movement_type = ANY (
      ARRAY[
        'Promotion'::character varying,
        'Demotion'::character varying,
        'Transfer'::character varying,
        'Department Change'::character varying,
        'Designation Change'::character varying,
        'Correction'::character varying
      ]
    )
  )
);

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_employee
  FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_previous_department
  FOREIGN KEY (previous_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_previous_designation
  FOREIGN KEY (previous_designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_previous_location
  FOREIGN KEY (previous_work_location_id) REFERENCES public.work_locations(id) ON DELETE SET NULL;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_new_department
  FOREIGN KEY (new_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_new_designation
  FOREIGN KEY (new_designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_new_location
  FOREIGN KEY (new_work_location_id) REFERENCES public.work_locations(id) ON DELETE SET NULL;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_salary_revision
  FOREIGN KEY (salary_revision_id) REFERENCES public.employee_salary(id) ON DELETE SET NULL;

ALTER TABLE public.employee_career_movements
  ADD CONSTRAINT fk_employee_career_movements_created_by
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_career_movements_employee
  ON public.employee_career_movements(employee_id, effective_date DESC);

-- Down Migration
DROP INDEX IF EXISTS public.idx_employee_career_movements_employee;

ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_created_by;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_salary_revision;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_new_location;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_new_designation;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_new_department;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_previous_location;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_previous_designation;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_previous_department;
ALTER TABLE public.employee_career_movements DROP CONSTRAINT IF EXISTS fk_employee_career_movements_employee;

DROP TABLE IF EXISTS public.employee_career_movements CASCADE;
