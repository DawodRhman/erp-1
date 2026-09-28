-- Up Migration

ALTER TABLE public.users ALTER COLUMN employee_id DROP NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS fk_user_employee;

ALTER TABLE public.users
  ADD CONSTRAINT fk_user_employee
  FOREIGN KEY (employee_id)
  REFERENCES public.employee_info(employee_id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_key text PRIMARY KEY,
  setting_value text NOT NULL,
  description text,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'credential_whatsapp_template',
  E'*Welcome to ESSPL HR*\\n\\nHello {employeeName},\\n\\nYour login account has been created.\\n\\nEmployee ID: {employeeId}\\nEmail: {email}\\nPassword: {password}\\n\\nLogin here: {loginUrl}\\n\\nPlease change your password after first login.',
  'WhatsApp message template used when sharing employee login credentials.'
)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE public.roles ALTER COLUMN department_id DROP NOT NULL;

INSERT INTO public.roles (department_id, role_name, description)
SELECT NULL, 'ceo', 'Chief Executive Officer read-only access'
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE role_name = 'ceo'
);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key IN (
  'dashboard:read',
  'employees:read',
  'attendance:read',
  'leave:read',
  'leave_capacity:read',
  'penalties:read_all',
  'announcements:read',
  'calendar:read',
  'directory:read',
  'notifications:read',
  'employee_attachments:read',
  'salary:read',
  'allowances:read',
  'config:read',
  'reports:read',
  'inventory:read',
  'purchasing:read'
)
WHERE r.role_name = 'ceo'
ON CONFLICT DO NOTHING;

-- Down Migration

DELETE FROM public.role_permissions
WHERE role_id IN (SELECT id FROM public.roles WHERE role_name = 'ceo');

DELETE FROM public.roles WHERE role_name = 'ceo';

DELETE FROM public.system_settings
WHERE setting_key = 'credential_whatsapp_template';

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
DROP TABLE IF EXISTS public.system_settings;

DELETE FROM public.users WHERE employee_id IS NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS fk_user_employee;

ALTER TABLE public.users
  ADD CONSTRAINT fk_user_employee
  FOREIGN KEY (employee_id)
  REFERENCES public.employee_info(employee_id);

ALTER TABLE public.users ALTER COLUMN employee_id SET NOT NULL;

ALTER TABLE public.users DROP COLUMN IF EXISTS is_active;
