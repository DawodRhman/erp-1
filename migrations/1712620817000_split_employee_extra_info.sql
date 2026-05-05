-- Up Migration

-- 1. Create ENUM types
DO $$ BEGIN
    CREATE TYPE public.emergency_relation AS ENUM ('father', 'mother', 'brother', 'sister', 'wife', 'husband', 'son', 'daughter', 'friend', 'neighbor', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.blood_group_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bank_account_type AS ENUM ('current', 'savings', 'salary');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Rename and Modify extra_employee_info -> emergency_contacts
ALTER TABLE public.extra_employee_info RENAME TO emergency_contacts;

-- Rename constraints
ALTER TABLE public.emergency_contacts RENAME CONSTRAINT extra_employee_info_pkey TO emergency_contacts_pkey;
ALTER TABLE public.emergency_contacts RENAME CONSTRAINT extra_employee_info_employee_id_key TO emergency_contacts_employee_id_key;

-- Rename trigger
DROP TRIGGER IF EXISTS trg_extra_employee_info_updated_at ON public.emergency_contacts;
CREATE TRIGGER trg_emergency_contacts_updated_at 
    BEFORE UPDATE ON public.emergency_contacts 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old columns no longer needed in this table
ALTER TABLE public.emergency_contacts 
    DROP COLUMN IF EXISTS bank_name,
    DROP COLUMN IF EXISTS bank_acc_num,
    DROP COLUMN IF EXISTS emergence_contact_1,
    DROP COLUMN IF EXISTS emergence_contact_2;

-- Add new emergency contact columns
ALTER TABLE public.emergency_contacts
    ADD COLUMN e_contact_1_relation public.emergency_relation,
    ADD COLUMN e_contact_1_full_name varchar(150),
    ADD COLUMN e_contact_1_phone varchar(20),
    ADD COLUMN e_contact_1_phone_country_code varchar(5) DEFAULT '+92',
    ADD COLUMN e_contact_1_email varchar(200),
    ADD COLUMN e_contact_2_relation public.emergency_relation,
    ADD COLUMN e_contact_2_full_name varchar(150),
    ADD COLUMN e_contact_2_phone varchar(20),
    ADD COLUMN e_contact_2_phone_country_code varchar(5) DEFAULT '+92',
    ADD COLUMN e_contact_2_email varchar(200),
    ADD COLUMN primary_contact smallint DEFAULT 1;

-- Data migration for existing rows (if any)
UPDATE public.emergency_contacts 
SET e_contact_1_relation = 'other', 
    e_contact_1_full_name = 'System Default', 
    e_contact_1_phone = '0000000000'
WHERE e_contact_1_relation IS NULL;

-- Set NOT NULL for required fields
ALTER TABLE public.emergency_contacts 
    ALTER COLUMN e_contact_1_relation SET NOT NULL,
    ALTER COLUMN e_contact_1_full_name SET NOT NULL,
    ALTER COLUMN e_contact_1_phone SET NOT NULL;

-- 3. Create employee_bank_accounts
CREATE TABLE public.employee_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id varchar(10) NOT NULL,
    bank_name varchar(150) NOT NULL,
    branch_name varchar(150),
    branch_code varchar(20),
    iban varchar(34) NOT NULL,
    account_title varchar(200) NOT NULL,
    account_number varchar(30),
    account_type public.bank_account_type,
    is_verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT employee_bank_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT employee_bank_accounts_employee_id_key UNIQUE (employee_id),
    CONSTRAINT employee_bank_accounts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE CASCADE,
    CONSTRAINT employee_bank_accounts_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_employee_bank_accounts_updated_at 
    BEFORE UPDATE ON public.employee_bank_accounts 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create employee_medical
CREATE TABLE public.employee_medical (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id varchar(10) NOT NULL,
    blood_group public.blood_group_type,
    date_of_birth date,
    gender public.gender_type,
    height_cm smallint,
    weight_kg smallint,
    has_disability boolean DEFAULT false,
    disability_type varchar(100),
    disability_description text,
    has_chronic_condition boolean DEFAULT false,
    chronic_condition_notes text,
    has_known_allergies boolean DEFAULT false,
    allergy_notes text,
    emergency_medication text,
    fitness_status varchar(30),
    last_medical_exam_date date,
    next_medical_exam_date date,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT employee_medical_pkey PRIMARY KEY (id),
    CONSTRAINT employee_medical_employee_id_key UNIQUE (employee_id),
    CONSTRAINT employee_medical_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE CASCADE,
    CONSTRAINT employee_medical_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_employee_medical_updated_at 
    BEFORE UPDATE ON public.employee_medical 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Down Migration

-- 1. Drop new tables
DROP TABLE IF EXISTS public.employee_medical;
DROP TABLE IF EXISTS public.employee_bank_accounts;

-- 2. Restore emergency_contacts to extra_employee_info
ALTER TABLE public.emergency_contacts 
    DROP COLUMN IF EXISTS e_contact_1_relation,
    DROP COLUMN IF EXISTS e_contact_1_full_name,
    DROP COLUMN IF EXISTS e_contact_1_phone,
    DROP COLUMN IF EXISTS e_contact_1_phone_country_code,
    DROP COLUMN IF EXISTS e_contact_1_email,
    DROP COLUMN IF EXISTS e_contact_2_relation,
    DROP COLUMN IF EXISTS e_contact_2_full_name,
    DROP COLUMN IF EXISTS e_contact_2_phone,
    DROP COLUMN IF EXISTS e_contact_2_phone_country_code,
    DROP COLUMN IF EXISTS e_contact_2_email,
    DROP COLUMN IF EXISTS primary_contact;

ALTER TABLE public.emergency_contacts
    ADD COLUMN emergence_contact_1 varchar(20),
    ADD COLUMN emergence_contact_2 varchar(20),
    ADD COLUMN bank_name varchar(150),
    ADD COLUMN bank_acc_num varchar(30);

-- Restore constraints and triggers
ALTER TABLE public.emergency_contacts RENAME CONSTRAINT emergency_contacts_pkey TO extra_employee_info_pkey;
ALTER TABLE public.emergency_contacts RENAME CONSTRAINT emergency_contacts_employee_id_key TO extra_employee_info_employee_id_key;

DROP TRIGGER IF EXISTS trg_emergency_contacts_updated_at ON public.emergency_contacts;
CREATE TRIGGER trg_extra_employee_info_updated_at 
    BEFORE UPDATE ON public.emergency_contacts 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Final rename
ALTER TABLE public.emergency_contacts RENAME TO extra_employee_info;

-- 3. Drop ENUM types
DROP TYPE IF EXISTS public.bank_account_type;
DROP TYPE IF EXISTS public.gender_type;
DROP TYPE IF EXISTS public.blood_group_type;
DROP TYPE IF EXISTS public.emergency_relation;
