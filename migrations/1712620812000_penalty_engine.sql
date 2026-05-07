-- Up Migration
CREATE TABLE public.penalty_rules (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(100) NOT NULL,
  amount_pkr   numeric(10,2) NOT NULL CHECK (amount_pkr >= 0),
  type         varchar(20)  NOT NULL CHECK (type IN ('flat','percentage')),
  is_active    boolean      NOT NULL DEFAULT true,
  created_by   uuid         REFERENCES public.users(id),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE public.employee_penalties (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         varchar(10)  NOT NULL REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT,
  rule_id             uuid         NOT NULL REFERENCES public.penalty_rules(id),
  date                date         NOT NULL,
  reason              text,
  status              varchar(20)  NOT NULL DEFAULT 'pending'
    CONSTRAINT employee_penalties_status_check CHECK (status IN ('pending','approved','rejected')),
  proposed_by         uuid         REFERENCES public.users(id),
  submitted_to_ho_at  timestamptz,
  reviewed_by         uuid         REFERENCES public.users(id),
  reviewed_at         timestamptz,
  review_note         text,
  employee_ack        boolean      NOT NULL DEFAULT false,
  employee_acked_at   timestamptz,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_penalty_rules_updated_at
  BEFORE UPDATE ON public.penalty_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_employee_penalties_updated_at
  BEFORE UPDATE ON public.employee_penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_penalties_employee ON public.employee_penalties(employee_id);
CREATE INDEX idx_penalties_status ON public.employee_penalties(status);

-- Down Migration
DROP TRIGGER IF EXISTS trg_employee_penalties_updated_at ON public.employee_penalties;
DROP TRIGGER IF EXISTS trg_penalty_rules_updated_at ON public.penalty_rules;
DROP INDEX IF EXISTS idx_penalties_status;
DROP INDEX IF EXISTS idx_penalties_employee;
DROP TABLE IF EXISTS public.employee_penalties;
DROP TABLE IF EXISTS public.penalty_rules;
