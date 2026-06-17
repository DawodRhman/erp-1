-- Up Migration
CREATE TABLE public.attendance_correction_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attendance_id uuid NOT NULL,
    employee_id character varying(10) NOT NULL,
    date date NOT NULL,
    requested_check_in time without time zone,
    requested_check_out time without time zone,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'submitted'::character varying NOT NULL,
    review_note text,
    requested_by uuid,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_correction_requests_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_correction_requests_status_check CHECK (
        status IN ('submitted', 'approved', 'rejected')
    ),
    CONSTRAINT attendance_correction_requests_attendance_fk FOREIGN KEY (attendance_id)
        REFERENCES public.attendance(id) ON DELETE CASCADE
);

CREATE INDEX idx_attendance_correction_requests_employee_date
    ON public.attendance_correction_requests(employee_id, date);

CREATE UNIQUE INDEX idx_attendance_correction_requests_one_open
    ON public.attendance_correction_requests(attendance_id)
    WHERE status = 'submitted';

-- Down Migration
DROP INDEX IF EXISTS public.idx_attendance_correction_requests_one_open;
DROP INDEX IF EXISTS public.idx_attendance_correction_requests_employee_date;
DROP TABLE IF EXISTS public.attendance_correction_requests CASCADE;

