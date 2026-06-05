-- Up Migration
CREATE TABLE IF NOT EXISTS public.employee_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id varchar(10) NOT NULL REFERENCES public.employee_info(employee_id) ON DELETE RESTRICT,
  kind varchar(20) NOT NULL,
  document_type varchar(100),
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  file_path text NOT NULL,
  mime_type varchar(150) NOT NULL,
  size_bytes integer NOT NULL,
  uploaded_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_attachments_kind_check CHECK (kind IN ('profile_photo', 'document')),
  CONSTRAINT employee_attachments_size_check CHECK (size_bytes > 0)
);

CREATE INDEX IF NOT EXISTS idx_employee_attachments_employee
  ON public.employee_attachments(employee_id);

INSERT INTO public.permissions (permission_key, description) VALUES
  ('employee_attachments:read', 'Read employee attachments'),
  ('employee_attachments:upload', 'Upload employee attachments')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key IN ('employee_attachments:read', 'employee_attachments:upload')
WHERE r.role_name IN ('super_admin', 'head_hr', 'hr_manager', 'branch_hr', 'department_hr', 'hr_executive')
ON CONFLICT DO NOTHING;

-- Down Migration
DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE rp.permission_id = p.id
  AND p.permission_key IN ('employee_attachments:read', 'employee_attachments:upload');

DELETE FROM public.permissions
WHERE permission_key IN ('employee_attachments:read', 'employee_attachments:upload');

DROP INDEX IF EXISTS public.idx_employee_attachments_employee;
DROP TABLE IF EXISTS public.employee_attachments;
