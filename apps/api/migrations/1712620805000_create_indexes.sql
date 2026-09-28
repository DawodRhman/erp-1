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
