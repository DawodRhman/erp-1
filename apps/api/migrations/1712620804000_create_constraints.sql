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
