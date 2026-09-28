-- Up Migration
ALTER TABLE public.employee_penalties
  ADD COLUMN IF NOT EXISTS applied_amount_pkr numeric(10,2);

UPDATE public.employee_penalties ep
SET applied_amount_pkr = pr.amount_pkr
FROM public.penalty_rules pr
WHERE ep.rule_id = pr.id
  AND ep.applied_amount_pkr IS NULL;

ALTER TABLE public.employee_penalties
  ALTER COLUMN applied_amount_pkr SET NOT NULL,
  ADD CONSTRAINT employee_penalties_applied_amount_check CHECK (applied_amount_pkr >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS penalty_rules_name_lower_key
  ON public.penalty_rules (lower(name));

-- Down Migration
DROP INDEX IF EXISTS public.penalty_rules_name_lower_key;

ALTER TABLE public.employee_penalties
  DROP CONSTRAINT IF EXISTS employee_penalties_applied_amount_check;

ALTER TABLE public.employee_penalties
  DROP COLUMN IF EXISTS applied_amount_pkr;
