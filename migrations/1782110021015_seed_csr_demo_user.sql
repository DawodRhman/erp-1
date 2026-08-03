DO $$
DECLARE
  v_csr_role UUID;
  v_perm RECORD;
  v_perm_id UUID;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_csr_role
  FROM public.roles
  WHERE role_name = 'csr_officer'
  LIMIT 1;

  IF v_csr_role IS NULL THEN
    INSERT INTO public.roles (role_name, description)
    VALUES ('csr_officer', 'CSR Officer - Customers, leads and quotation workflow')
    RETURNING id INTO v_csr_role;
  ELSE
    UPDATE public.roles
    SET description = 'CSR Officer - Customers, leads and quotation workflow'
    WHERE id = v_csr_role;
  END IF;

  FOR v_perm IN
    SELECT *
    FROM (
      VALUES
        ('crm:read', 'Read customers, leads and quotations'),
        ('crm:write', 'Create customers, leads and quotations')
    ) AS p(permission_key, description)
  LOOP
    SELECT id INTO v_perm_id
    FROM public.permissions
    WHERE permission_key = v_perm.permission_key
    LIMIT 1;

    IF v_perm_id IS NULL THEN
      INSERT INTO public.permissions (permission_key, description)
      VALUES (v_perm.permission_key, v_perm.description);
    ELSE
      UPDATE public.permissions
      SET description = v_perm.description
      WHERE id = v_perm_id;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.employee_info
    WHERE employee_id = 'EMP904'
  ) THEN
    INSERT INTO public.employee_info (
      employee_id,
      name,
      father_name,
      cnic,
      date_of_birth
    )
    VALUES (
      'EMP904',
      'CSR Officer',
      'ESSPL',
      '42101-9000904-4',
      '01-01-1995'
    );
  END IF;

  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = 'csr.officer@esspl.com.pk'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    INSERT INTO public.users (
      employee_id,
      email,
      role_id,
      password,
      is_active,
      must_change_password
    )
    VALUES (
      'EMP904',
      'csr.officer@esspl.com.pk',
      v_csr_role,
      '$2b$12$OIE5VbofoE0ZcrxYOyyksutjAyRg8edQfOY454A1gksEAarLhJMmO',
      TRUE,
      FALSE
    );
  ELSE
    UPDATE public.users
    SET role_id = v_csr_role,
        password = '$2b$12$OIE5VbofoE0ZcrxYOyyksutjAyRg8edQfOY454A1gksEAarLhJMmO',
        is_active = TRUE,
        must_change_password = FALSE
    WHERE id = v_user_id;
  END IF;

  SELECT id INTO v_csr_role FROM public.roles WHERE role_name = 'csr_officer';

  FOR v_perm IN SELECT id FROM public.permissions WHERE permission_key IN ('crm:read', 'crm:write', 'matrix:operations') LOOP
    IF v_csr_role IS NOT NULL THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (v_csr_role, v_perm.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
