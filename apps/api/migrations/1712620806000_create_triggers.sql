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
