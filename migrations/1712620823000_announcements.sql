-- Up Migration
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title character varying(255) NOT NULL,
  body text NOT NULL,
  audience character varying(20) DEFAULT 'all'::character varying NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_audience_check CHECK (((audience)::text = ANY (ARRAY['all'::text, 'hr'::text, 'employee'::text]))),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT announcements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.permissions (permission_key, description) VALUES
  ('announcements:read', 'Announcements read'),
  ('announcements:write', 'Announcements write')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key = 'announcements:read'
WHERE r.role_name IN ('super_admin', 'employee', 'hr_executive', 'hr_manager', 'head_hr', 'branch_hr', 'department_hr')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key = 'announcements:write'
WHERE r.role_name IN ('super_admin', 'hr_manager', 'head_hr')
ON CONFLICT DO NOTHING;

-- Down Migration
DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE rp.permission_id = p.id
  AND p.permission_key IN ('announcements:read', 'announcements:write');

DELETE FROM public.permissions
WHERE permission_key IN ('announcements:read', 'announcements:write');

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
DROP TABLE IF EXISTS public.announcements;
