-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.is_admin(auth.uid()));

-- 5. write_permissions table
CREATE TABLE public.write_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.database_connections(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_write_permissions_user ON public.write_permissions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_write_permissions_conn ON public.write_permissions(connection_id) WHERE revoked_at IS NULL;

ALTER TABLE public.write_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own write permissions"
ON public.write_permissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all write permissions"
ON public.write_permissions FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can grant write permissions"
ON public.write_permissions FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) AND granted_by = auth.uid());

CREATE POLICY "Admins can update write permissions"
ON public.write_permissions FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete write permissions"
ON public.write_permissions FOR DELETE
USING (public.is_admin(auth.uid()));

-- 6. has_write_permission helper
CREATE OR REPLACE FUNCTION public.has_write_permission(_user_id uuid, _connection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.write_permissions
    WHERE user_id = _user_id
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND (connection_id IS NULL OR connection_id = _connection_id)
  );
$$;

-- 7. Update handle_new_user to also assign role (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin'::public.app_role;
  ELSE
    assigned_role := 'user'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (recreate to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();