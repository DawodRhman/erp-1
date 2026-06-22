-- Up Migration
INSERT INTO public.permissions (permission_key, description) VALUES
  ('employees:department_read', 'Read employees in assigned department scope'),
  ('attendance:department_read', 'Read attendance in assigned department scope'),
  ('leave:department_read', 'Read leave in assigned department scope'),
  ('leave:department_approve', 'Approve or reject leave in assigned department scope'),
  ('dashboard:department_read', 'Read dashboard in assigned department scope'),
  ('penalties:department_read', 'Read penalties in assigned department scope'),
  ('penalties:department_propose', 'Propose penalties in assigned department scope'),
  ('announcements:department_write', 'Write announcements in assigned department scope'),
  ('calendar:department_write', 'Write calendar events in assigned department scope')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.roles (department_id, role_name, description)
SELECT NULL, 'department_head', 'Department Head with department and optional location scope'
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE role_name = 'department_head'
);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key IN (
  'employees:self_read',
  'employees:department_read',
  'config:read',
  'attendance:department_read',
  'leave:department_read',
  'leave:department_approve',
  'dashboard:department_read',
  'penalties:department_read',
  'penalties:department_propose',
  'penalties:read_own',
  'calendar:read',
  'calendar:department_write',
  'directory:read',
  'announcements:read',
  'announcements:department_write',
  'notifications:read'
)
WHERE r.role_name = 'department_head'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.department_head_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  work_location_id uuid REFERENCES public.work_locations(id) ON DELETE RESTRICT,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT department_head_assignment_dates_check
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_department_head_active_assignment
  ON public.department_head_assignments(user_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_department_head_scope
  ON public.department_head_assignments(department_id, work_location_id)
  WHERE is_active = true;

-- Down Migration
DROP INDEX IF EXISTS public.idx_department_head_scope;
DROP INDEX IF EXISTS public.uq_department_head_active_assignment;
DROP TABLE IF EXISTS public.department_head_assignments;

DELETE FROM public.role_permissions rp
USING public.roles r
WHERE rp.role_id = r.id
  AND r.role_name = 'department_head';

DELETE FROM public.roles WHERE role_name = 'department_head';

DELETE FROM public.permissions WHERE permission_key IN (
  'employees:department_read',
  'attendance:department_read',
  'leave:department_read',
  'leave:department_approve',
  'dashboard:department_read',
  'penalties:department_read',
  'penalties:department_propose',
  'announcements:department_write',
  'calendar:department_write'
);
