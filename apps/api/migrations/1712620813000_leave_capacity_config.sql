-- Up Migration
CREATE TABLE public.leave_capacity_config (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid    NOT NULL REFERENCES public.departments(id),
  max_percent   int     NOT NULL DEFAULT 50 CHECK (max_percent BETWEEN 1 AND 100),
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid    REFERENCES public.users(id),
  updated_by    uuid    REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id)
);

CREATE TRIGGER trg_leave_capacity_config_updated_at
  BEFORE UPDATE ON public.leave_capacity_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_leave_capacity_config_updated_at ON public.leave_capacity_config;
DROP TABLE IF EXISTS public.leave_capacity_config;
