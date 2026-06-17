-- Up Migration
CREATE TABLE IF NOT EXISTS public.announcement_read_receipts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  announcement_id uuid NOT NULL,
  user_id uuid,
  employee_id character varying(10),
  read_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT announcement_read_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT announcement_read_receipts_unique_user UNIQUE (announcement_id, user_id),
  CONSTRAINT announcement_read_receipts_unique_employee UNIQUE (announcement_id, employee_id)
);

ALTER TABLE public.announcement_read_receipts
  ADD CONSTRAINT fk_announcement_read_receipts_announcement
  FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;

ALTER TABLE public.announcement_read_receipts
  ADD CONSTRAINT fk_announcement_read_receipts_user
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.announcement_read_receipts
  ADD CONSTRAINT fk_announcement_read_receipts_employee
  FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_read_receipts_employee
  ON public.announcement_read_receipts(employee_id, read_at DESC);

-- Down Migration
DROP INDEX IF EXISTS public.idx_announcement_read_receipts_employee;

ALTER TABLE public.announcement_read_receipts
  DROP CONSTRAINT IF EXISTS fk_announcement_read_receipts_employee;

ALTER TABLE public.announcement_read_receipts
  DROP CONSTRAINT IF EXISTS fk_announcement_read_receipts_user;

ALTER TABLE public.announcement_read_receipts
  DROP CONSTRAINT IF EXISTS fk_announcement_read_receipts_announcement;

DROP TABLE IF EXISTS public.announcement_read_receipts;
