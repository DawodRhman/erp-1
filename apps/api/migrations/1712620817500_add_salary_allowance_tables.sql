-- Up Migration
-- allowance_types table (sparse)
CREATE TABLE public.allowance_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT allowance_types_pkey PRIMARY KEY (id)
);

-- employee_salary table (salary history)
CREATE TABLE public.employee_salary (
    id uuid DEFAULT gen_random_uuid() NOT NULL ,
    employee_id character varying(10) NOT NULL,
    basic_salary numeric(14,2) NOT NULL CHECK (basic_salary >= 0),
    currency character varying(3) DEFAULT 'PKR' NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    is_current boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    revision_type character varying(30) NOT NULL,
    revision_percent numeric(5,2),
    revision_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_salary_pkey PRIMARY KEY (id)
);

-- employee_allowances table
CREATE TABLE public.employee_allowances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    allowance_type_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL CHECK (amount >= 0),
    is_percentage boolean DEFAULT false NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_allowances_pkey PRIMARY KEY (id)
);

-- Foreign Keys
ALTER TABLE public.employee_salary
    ADD CONSTRAINT fk_employee_salary_employee
    FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE CASCADE;

ALTER TABLE public.employee_salary
    ADD CONSTRAINT fk_employee_salary_created_by
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.employee_allowances
    ADD CONSTRAINT fk_employee_allowances_employee
    FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE CASCADE;

ALTER TABLE public.employee_allowances
    ADD CONSTRAINT fk_employee_allowances_type
    FOREIGN KEY (allowance_type_id) REFERENCES public.allowance_types(id) ON DELETE RESTRICT;

ALTER TABLE public.employee_allowances
    ADD CONSTRAINT fk_employee_allowances_created_by
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Unique constraints: Only one current per employee for salary, and per employee+type for allowances
CREATE UNIQUE INDEX uq_employee_salary_current ON public.employee_salary(employee_id) WHERE is_current = true;
CREATE UNIQUE INDEX uq_employee_allowance_current ON public.employee_allowances(employee_id, allowance_type_id) WHERE is_current = true;

-- Indexes for performance
CREATE INDEX idx_employee_salary_employee ON public.employee_salary(employee_id);
CREATE INDEX idx_employee_allowances_employee ON public.employee_allowances(employee_id);
CREATE INDEX idx_employee_allowances_type ON public.employee_allowances(allowance_type_id);

-- Down Migration
DROP INDEX IF EXISTS public.idx_employee_allowances_type;
DROP INDEX IF EXISTS public.idx_employee_allowances_employee;
DROP INDEX IF EXISTS public.idx_employee_salary_employee;
DROP INDEX IF EXISTS public.uq_employee_allowance_current;
DROP INDEX IF EXISTS public.uq_employee_salary_current;

ALTER TABLE public.employee_allowances DROP CONSTRAINT IF EXISTS fk_employee_allowances_created_by;
ALTER TABLE public.employee_allowances DROP CONSTRAINT IF EXISTS fk_employee_allowances_type;
ALTER TABLE public.employee_allowances DROP CONSTRAINT IF EXISTS fk_employee_allowances_employee;
ALTER TABLE public.employee_salary DROP CONSTRAINT IF EXISTS fk_employee_salary_created_by;
ALTER TABLE public.employee_salary DROP CONSTRAINT IF EXISTS fk_employee_salary_employee;

DROP TABLE IF EXISTS public.employee_allowances CASCADE;
DROP TABLE IF EXISTS public.employee_salary CASCADE;
DROP TABLE IF EXISTS public.allowance_types CASCADE;
