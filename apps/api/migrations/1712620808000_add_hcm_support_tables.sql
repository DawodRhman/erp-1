-- Up Migration
ALTER TABLE public.job_info
ADD COLUMN IF NOT EXISTS probation_end_date date,
ADD COLUMN IF NOT EXISTS contract_end_date date;

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    date date NOT NULL,
    title character varying(255) NOT NULL,
    visibility character varying(20) DEFAULT 'all'::character varying NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT calendar_events_pkey PRIMARY KEY (id),
    CONSTRAINT calendar_events_visibility_check CHECK (((visibility)::text = ANY (ARRAY['all'::text, 'hr'::text, 'employee'::text]))),
    CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT calendar_events_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    role character varying(100),
    type character varying(50) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_target_check CHECK (((user_id IS NOT NULL) OR (role IS NOT NULL))),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.pending_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    missing_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pending_actions_pkey PRIMARY KEY (id),
    CONSTRAINT pending_actions_status_check CHECK (((status)::text = ANY (ARRAY['open'::text, 'resolved'::text]))),
    CONSTRAINT pending_actions_missing_fields_check CHECK ((jsonb_typeof(missing_fields) = 'array'::text)),
    CONSTRAINT pending_actions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT,
    CONSTRAINT pending_actions_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.urgent_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    type character varying(50) NOT NULL,
    expiry_date date NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT urgent_alerts_pkey PRIMARY KEY (id),
    CONSTRAINT urgent_alerts_status_check CHECK (((status)::text = ANY (ARRAY['open'::text, 'resolved'::text]))),
    CONSTRAINT urgent_alerts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT,
    CONSTRAINT urgent_alerts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pending_actions_updated_at BEFORE UPDATE ON public.pending_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_urgent_alerts_updated_at BEFORE UPDATE ON public.urgent_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_urgent_alerts_updated_at ON public.urgent_alerts;
DROP TRIGGER IF EXISTS trg_pending_actions_updated_at ON public.pending_actions;
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON public.calendar_events;

DROP TABLE IF EXISTS public.urgent_alerts;
DROP TABLE IF EXISTS public.pending_actions;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.calendar_events;

ALTER TABLE public.job_info
DROP COLUMN IF EXISTS contract_end_date,
DROP COLUMN IF EXISTS probation_end_date;
