// Sequenace 


 -- Up Migration
CREATE SEQUENCE public.customer_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.do_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.grn_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.invoice_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.pay_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.po_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.pr_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.quotation_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.vendor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Down Migration
DROP SEQUENCE IF EXISTS public.customer_seq;
DROP SEQUENCE IF EXISTS public.do_seq;
DROP SEQUENCE IF EXISTS public.grn_seq;
DROP SEQUENCE IF EXISTS public.invoice_seq;
DROP SEQUENCE IF EXISTS public.pay_seq;
DROP SEQUENCE IF EXISTS public.po_seq;
DROP SEQUENCE IF EXISTS public.pr_seq;
DROP SEQUENCE IF EXISTS public.quotation_seq;
DROP SEQUENCE IF EXISTS public.vendor_seq;





// here is functions 

-- Up Migration
CREATE FUNCTION public.generate_csid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.csid := 'CS-' || LPAD(nextval('public.customer_seq')::TEXT, 8, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_do_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.do_id := 'DO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.do_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_grn_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.grn_id := 'GRN-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.grn_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_invoice_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.invoice_id := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.invoice_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_po_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.po_id := 'PO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.po_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_pr_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.pr_id := 'PR-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.pr_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_quotation_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.quotation_id := 'QUO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.quotation_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_vendor_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.vendor_id := 'V-' || LPAD(nextval('public.vendor_seq')::TEXT, 8, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$;

-- Down Migration
DROP FUNCTION IF EXISTS public.generate_csid();
DROP FUNCTION IF EXISTS public.generate_do_id();
DROP FUNCTION IF EXISTS public.generate_grn_id();
DROP FUNCTION IF EXISTS public.generate_invoice_id();
DROP FUNCTION IF EXISTS public.generate_po_id();
DROP FUNCTION IF EXISTS public.generate_pr_id();
DROP FUNCTION IF EXISTS public.generate_quotation_id();
DROP FUNCTION IF EXISTS public.generate_vendor_id();
DROP FUNCTION IF EXISTS public.update_updated_at_column();



// here is tables 


-- Up Migration
CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    shift_id uuid NOT NULL,
    date date NOT NULL,
    check_in time without time zone,
    check_out time without time zone,
    status character varying(20) DEFAULT 'absent'::character varying NOT NULL,
    notes text,
    marked_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'half_day'::text, 'holiday'::text, 'on_leave'::text])))
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text,
    table_name text,
    record_id uuid,
    reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    csid character varying(12),
    customer_name text NOT NULL,
    company_name text NOT NULL,
    customer_type text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.delivery_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_order_id uuid,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    remarks text,
    product_id uuid NOT NULL,
    CONSTRAINT delivery_order_items_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE public.delivery_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    do_id character varying(20),
    issued_to_type text,
    issued_to_id uuid,
    issued_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_remarks text,
    status text,
    quotation_id uuid,
    CONSTRAINT delivery_orders_issued_to_type_check CHECK ((issued_to_type = ANY (ARRAY['EMPLOYEE'::text, 'CUSTOMER'::text]))),
    CONSTRAINT delivery_orders_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])))
);

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_code text NOT NULL,
    department_name text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    parent_department_id uuid
);

CREATE TABLE public.designations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.employee_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    father_name character varying(100) NOT NULL,
    cnic character varying(20) NOT NULL,
    date_of_birth character varying(15) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.employee_job_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    department_id uuid NOT NULL,
    designation_id uuid NOT NULL,
    manager_emp_id character varying(10),
    start_date date NOT NULL,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.employment_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_name character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.extra_employee_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    contact_1 character varying(15) NOT NULL,
    contact_2 character varying(15),
    emergence_contact_1 character varying(15),
    emergence_contact_2 character varying(15),
    bank_name character varying(100),
    bank_acc_num character varying(15),
    perment_address character varying(255),
    postal_address character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.grn_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grn_id uuid,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    quantity_received integer NOT NULL,
    remarks text,
    CONSTRAINT grn_items_quantity_received_check CHECK ((quantity_received >= 0))
);

CREATE TABLE public.grns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grn_id character varying(20),
    po_id uuid,
    received_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    serial_number text NOT NULL,
    current_status text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_items_current_status_check CHECK ((current_status = ANY (ARRAY['AVAILABLE'::text, 'ALLOCATED'::text, 'INSTALLED'::text, 'RETURNED'::text, 'DAMAGED'::text])))
);

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inventory_item_id uuid,
    movement_type text,
    reference_type text,
    reference_id uuid,
    moved_by uuid,
    remarks text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['STOCK_IN'::text, 'STOCK_OUT'::text, 'TRANSFER'::text, 'RETURN'::text])))
);

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    product_id uuid NOT NULL,
    quantity integer,
    unit_price numeric(10,2)
);

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying(20),
    quotation_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    payment_status text,
    remarks text,
    approval_status text,
    CONSTRAINT invoices_approval_statuses_check CHECK ((approval_status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]))),
    CONSTRAINT invoices_payment_status_check CHECK ((payment_status = ANY (ARRAY['UNPAID'::text, 'PAID'::text])))
);

CREATE TABLE public.item_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.job_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    department_id uuid NOT NULL,
    designation_id uuid NOT NULL,
    employment_type_id uuid NOT NULL,
    job_status_id uuid NOT NULL,
    work_mode_id uuid NOT NULL,
    work_location_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    date_of_joining date NOT NULL,
    date_of_exit date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.job_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status_name character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.leave_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    leave_type_id uuid NOT NULL,
    year integer NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    used integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.leave_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    days_allowed integer NOT NULL,
    year integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT leave_policies_days_allowed_check CHECK ((days_allowed >= 0))
);

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    leave_type_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    end_by_force date,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_end_by_force CHECK (((end_by_force IS NULL) OR ((end_by_force >= start_date) AND (end_by_force <= end_date)))),
    CONSTRAINT chk_leave_dates CHECK ((end_date >= start_date)),
    CONSTRAINT leave_requests_status_check CHECK (((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);

CREATE TABLE public.leave_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_key character varying(150) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_name text NOT NULL,
    category_id uuid,
    product_type text,
    tracking_type text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    quantity integer,
    CONSTRAINT items_item_type_check CHECK ((product_type = ANY (ARRAY['ASSET'::text, 'CONSUMABLE'::text, 'SERVICE'::text]))),
    CONSTRAINT items_tracking_type_check CHECK ((tracking_type = ANY (ARRAY['SERIAL'::text, 'IMEI'::text, 'NONE'::text])))
);

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2),
    remarks text,
    CONSTRAINT purchase_order_items_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id character varying(20),
    pr_id uuid,
    vendor_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL
);

CREATE TABLE public.purchase_request_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_request_id uuid,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    remarks text,
    CONSTRAINT purchase_request_items_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE public.purchase_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pr_id character varying(20),
    requested_by uuid,
    department_id uuid,
    status text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_remarks text,
    CONSTRAINT purchase_requests_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])))
);

CREATE TABLE public.quotation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_id uuid,
    quantity integer,
    unit_price numeric(10,2),
    product_id uuid NOT NULL
);

CREATE TABLE public.quotations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quotation_id character varying(20),
    customer_id uuid,
    status text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    approved_by uuid,
    approved_at timestamp with time zone,
    approval_remarks text,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT quotations_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'APPROVED'::text, 'REJECTED'::text])))
);

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    role_name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    late_after_minutes integer DEFAULT 15 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id character varying(10) NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id character varying(10),
    vendor_name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.work_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.work_modes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mode_name character varying(50) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.delivery_order_items CASCADE;
DROP TABLE IF EXISTS public.delivery_orders CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.designations CASCADE;
DROP TABLE IF EXISTS public.employee_info CASCADE;
DROP TABLE IF EXISTS public.employee_job_history CASCADE;
DROP TABLE IF EXISTS public.employment_types CASCADE;
DROP TABLE IF EXISTS public.extra_employee_info CASCADE;
DROP TABLE IF EXISTS public.grn_items CASCADE;
DROP TABLE IF EXISTS public.grns CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.item_categories CASCADE;
DROP TABLE IF EXISTS public.job_info CASCADE;
DROP TABLE IF EXISTS public.job_statuses CASCADE;
DROP TABLE IF EXISTS public.leave_balances CASCADE;
DROP TABLE IF EXISTS public.leave_policies CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.leave_types CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.purchase_request_items CASCADE;
DROP TABLE IF EXISTS public.purchase_requests CASCADE;
DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.work_locations CASCADE;
DROP TABLE IF EXISTS public.work_modes CASCADE;
 

// here is Constraints



-- Up Migration
ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_csid_key UNIQUE (csid);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.delivery_order_items
    ADD CONSTRAINT delivery_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_do_id_key UNIQUE (do_id);

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_department_code_key UNIQUE (department_code);

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_title_key UNIQUE (title);

ALTER TABLE ONLY public.employee_info
    ADD CONSTRAINT employee_info_cnic_key UNIQUE (cnic);

ALTER TABLE ONLY public.employee_info
    ADD CONSTRAINT employee_info_employee_id_key UNIQUE (employee_id);

ALTER TABLE ONLY public.employee_info
    ADD CONSTRAINT employee_info_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employee_job_history
    ADD CONSTRAINT employee_job_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employment_types
    ADD CONSTRAINT employment_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employment_types
    ADD CONSTRAINT employment_types_type_name_key UNIQUE (type_name);

ALTER TABLE ONLY public.extra_employee_info
    ADD CONSTRAINT extra_employee_info_employee_id_key UNIQUE (employee_id);

ALTER TABLE ONLY public.extra_employee_info
    ADD CONSTRAINT extra_employee_info_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_grn_id_key UNIQUE (grn_id);

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_serial_number_key UNIQUE (serial_number);

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_id_key UNIQUE (invoice_id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.item_categories
    ADD CONSTRAINT item_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT job_info_employee_id_key UNIQUE (employee_id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT job_info_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.job_statuses
    ADD CONSTRAINT job_statuses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.job_statuses
    ADD CONSTRAINT job_statuses_status_name_key UNIQUE (status_name);

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT leave_policies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_name_key UNIQUE (name);

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_key_key UNIQUE (permission_key);

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_id_key UNIQUE (po_id);

ALTER TABLE ONLY public.purchase_request_items
    ADD CONSTRAINT purchase_request_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pr_id_key UNIQUE (pr_id);

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quotation_id_key UNIQUE (quotation_id);

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_department_id_role_name_key UNIQUE (department_id, role_name);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_name_key UNIQUE (name);

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT unique_attendance_per_day UNIQUE (employee_id, date);

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT unique_balance UNIQUE (employee_id, leave_type_id, year);

ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT unique_policy_per_type_year UNIQUE (leave_type_id, department_id, year);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_vendor_id_key UNIQUE (vendor_id);

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_location_name_key UNIQUE (location_name);

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.work_modes
    ADD CONSTRAINT work_modes_mode_name_key UNIQUE (mode_name);

ALTER TABLE ONLY public.work_modes
    ADD CONSTRAINT work_modes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.delivery_order_items
    ADD CONSTRAINT delivery_order_items_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES public.delivery_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.delivery_order_items
    ADD CONSTRAINT delivery_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_fkey FOREIGN KEY (parent_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT fk_attendance_marked_by FOREIGN KEY (marked_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT fk_attendance_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT fk_balance_employee FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT fk_balance_type FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);

ALTER TABLE ONLY public.extra_employee_info
    ADD CONSTRAINT fk_employee_info_id FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id);

ALTER TABLE ONLY public.employee_job_history
    ADD CONSTRAINT fk_history_department FOREIGN KEY (department_id) REFERENCES public.departments(id);

ALTER TABLE ONLY public.employee_job_history
    ADD CONSTRAINT fk_history_desig FOREIGN KEY (designation_id) REFERENCES public.designations(id);

ALTER TABLE ONLY public.employee_job_history
    ADD CONSTRAINT fk_history_employee FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.employee_job_history
    ADD CONSTRAINT fk_history_manager FOREIGN KEY (manager_emp_id) REFERENCES public.employee_info(employee_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_designation_id FOREIGN KEY (designation_id) REFERENCES public.designations(id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_employment_type_id FOREIGN KEY (employment_type_id) REFERENCES public.employment_types(id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_info_id FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_status_id FOREIGN KEY (job_status_id) REFERENCES public.job_statuses(id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_work_location_id FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id);

ALTER TABLE ONLY public.job_info
    ADD CONSTRAINT fk_job_work_mode_id FOREIGN KEY (work_mode_id) REFERENCES public.work_modes(id);

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT fk_leave_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT fk_leave_type FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);

ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT fk_policy_department FOREIGN KEY (department_id) REFERENCES public.departments(id);

ALTER TABLE ONLY public.leave_policies
    ADD CONSTRAINT fk_policy_leave_type FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_user_employee FOREIGN KEY (employee_id) REFERENCES public.employee_info(employee_id);

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.grns(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_item_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_item_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_moved_by_fkey FOREIGN KEY (moved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_item_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.item_categories(id);

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES public.purchase_requests(id);

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);

ALTER TABLE ONLY public.purchase_request_items
    ADD CONSTRAINT purchase_request_items_item_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.purchase_request_items
    ADD CONSTRAINT purchase_request_items_purchase_request_id_fkey FOREIGN KEY (purchase_request_id) REFERENCES public.purchase_requests(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Down Migration
-- Constraints are automatically dropped by DROP TABLE CASCADE in 003_create_tables.sql





// Here is indexes


-- Up Migration
CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);

CREATE INDEX idx_attendance_employee_date ON public.attendance USING btree (employee_id, date);

CREATE INDEX idx_attendance_status ON public.attendance USING btree (status);

CREATE INDEX idx_leave_dates ON public.leave_requests USING btree (start_date, end_date);

CREATE INDEX idx_leave_employee ON public.leave_requests USING btree (employee_id);

CREATE INDEX idx_leave_status ON public.leave_requests USING btree (status);

-- Down Migration
DROP INDEX IF EXISTS idx_attendance_date;
DROP INDEX IF EXISTS idx_attendance_employee_date;
DROP INDEX IF EXISTS idx_attendance_status;
DROP INDEX IF EXISTS idx_leave_dates;
DROP INDEX IF EXISTS idx_leave_employee;
DROP INDEX IF EXISTS idx_leave_status;



And Triggers


-- Up Migration
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_csid BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.generate_csid();

CREATE TRIGGER trg_designations_updated_at BEFORE UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_do_id BEFORE INSERT ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.generate_do_id();

CREATE TRIGGER trg_employee_info_updated_at BEFORE UPDATE ON public.employee_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_employee_job_history_updated_at BEFORE UPDATE ON public.employee_job_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_employment_types_updated_at BEFORE UPDATE ON public.employment_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_extra_employee_info_updated_at BEFORE UPDATE ON public.extra_employee_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_grn_id BEFORE INSERT ON public.grns FOR EACH ROW EXECUTE FUNCTION public.generate_grn_id();

CREATE TRIGGER trg_invoice_id BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_id();

CREATE TRIGGER trg_job_info_updated_at BEFORE UPDATE ON public.job_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_job_statuses_updated_at BEFORE UPDATE ON public.job_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_leave_policies_updated_at BEFORE UPDATE ON public.leave_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_leave_types_updated_at BEFORE UPDATE ON public.leave_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_po_id BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.generate_po_id();

CREATE TRIGGER trg_pr_id BEFORE INSERT ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.generate_pr_id();

CREATE TRIGGER trg_quotation_id BEFORE INSERT ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.generate_quotation_id();

CREATE TRIGGER trg_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_vendor_id BEFORE INSERT ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.generate_vendor_id();

CREATE TRIGGER trg_work_locations_updated_at BEFORE UPDATE ON public.work_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_work_modes_updated_at BEFORE UPDATE ON public.work_modes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
DROP TRIGGER IF EXISTS trg_csid ON public.customers;
DROP TRIGGER IF EXISTS trg_designations_updated_at ON public.designations;
DROP TRIGGER IF EXISTS trg_do_id ON public.delivery_orders;
DROP TRIGGER IF EXISTS trg_employee_info_updated_at ON public.employee_info;
DROP TRIGGER IF EXISTS trg_employee_job_history_updated_at ON public.employee_job_history;
DROP TRIGGER IF EXISTS trg_employment_types_updated_at ON public.employment_types;
DROP TRIGGER IF EXISTS trg_extra_employee_info_updated_at ON public.extra_employee_info;
DROP TRIGGER IF EXISTS trg_grn_id ON public.grns;
DROP TRIGGER IF EXISTS trg_invoice_id ON public.invoices;
DROP TRIGGER IF EXISTS trg_job_info_updated_at ON public.job_info;
DROP TRIGGER IF EXISTS trg_job_statuses_updated_at ON public.job_statuses;
DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON public.leave_balances;
DROP TRIGGER IF EXISTS trg_leave_policies_updated_at ON public.leave_policies;
DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
DROP TRIGGER IF EXISTS trg_leave_types_updated_at ON public.leave_types;
DROP TRIGGER IF EXISTS trg_po_id ON public.purchase_orders;
DROP TRIGGER IF EXISTS trg_pr_id ON public.purchase_requests;
DROP TRIGGER IF EXISTS trg_quotation_id ON public.quotations;
DROP TRIGGER IF EXISTS trg_shifts_updated_at ON public.shifts;
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS trg_vendor_id ON public.vendors;
DROP TRIGGER IF EXISTS trg_work_locations_updated_at ON public.work_locations;
DROP TRIGGER IF EXISTS trg_work_modes_updated_at ON public.work_modes;



and other tables Migrations files Data ere 


-- Up Migration
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS ack boolean NOT NULL DEFAULT false;

-- Down Migration
ALTER TABLE public.attendance
DROP COLUMN IF EXISTS ack;




another 


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




another one 



-- Up Migration
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

-- Down Migration
ALTER TABLE public.users
  DROP COLUMN IF EXISTS password_changed_at,
  DROP COLUMN IF EXISTS must_change_password;





-- Up Migration
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
ALTER TABLE public.departments
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS is_active;



-- Up Migration
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS state varchar(20) NOT NULL DEFAULT 'draft'
    CONSTRAINT attendance_state_check CHECK (state IN ('draft','saved','submitted','locked','ho_unlocked')),
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlocked_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS unlock_reason text,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
ALTER TABLE public.attendance
  DROP COLUMN IF EXISTS unlocked_at,
  DROP COLUMN IF EXISTS unlock_reason,
  DROP COLUMN IF EXISTS unlocked_by,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS submitted_by,
  DROP COLUMN IF EXISTS state;




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




-- Up Migration
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Down Migration
ALTER TABLE public.leave_requests
  DROP COLUMN IF EXISTS rejection_reason;
