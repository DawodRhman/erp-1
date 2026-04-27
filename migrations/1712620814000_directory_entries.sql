-- Up Migration
CREATE TABLE public.directory_entries (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         varchar(10)  REFERENCES public.employee_info(employee_id) ON DELETE SET NULL,
  name                varchar(200) NOT NULL,
  email               varchar(200),
  phone_internal      varchar(50),
  phone_mobile        varchar(50),
  phone_mobile_public boolean      NOT NULL DEFAULT false,
  role_title          varchar(200),
  department_id       uuid         REFERENCES public.departments(id),
  branch_id           uuid         REFERENCES public.work_locations(id),
  availability        varchar(50)  CHECK (availability IN ('available','busy','out_of_office')),
  created_by          uuid         REFERENCES public.users(id),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_directory_entries_updated_at
  BEFORE UPDATE ON public.directory_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_directory_department ON public.directory_entries(department_id);
CREATE INDEX idx_directory_branch ON public.directory_entries(branch_id);

-- Down Migration
DROP TRIGGER IF EXISTS trg_directory_entries_updated_at ON public.directory_entries;
DROP INDEX IF EXISTS idx_directory_branch;
DROP INDEX IF EXISTS idx_directory_department;
DROP TABLE IF EXISTS public.directory_entries;
