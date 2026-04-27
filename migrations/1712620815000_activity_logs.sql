-- Up Migration
CREATE TABLE public.activity_logs (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         REFERENCES public.users(id),
  action      text         NOT NULL,
  entity_type varchar(100),
  entity_id   varchar(100),
  meta        jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Down Migration
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_activity_logs_user;
DROP TABLE IF EXISTS public.activity_logs;
