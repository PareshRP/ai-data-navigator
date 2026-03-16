
-- ─── Profiles table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Database connections table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.database_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('postgresql', 'mongodb')),
  host             TEXT NOT NULL,
  port             INTEGER NOT NULL,
  database_name    TEXT NOT NULL,
  username         TEXT NOT NULL,
  password_enc     BYTEA,
  ssl_enabled      BOOLEAN NOT NULL DEFAULT true,
  environment      TEXT NOT NULL DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production')),
  status           TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_tested_at   TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.database_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own connections"
  ON public.database_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own connections"
  ON public.database_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own connections"
  ON public.database_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own connections"
  ON public.database_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Schema metadata cache ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connection_schemas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.database_connections(id) ON DELETE CASCADE,
  schema_name   TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  columns       JSONB NOT NULL DEFAULT '[]',
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, schema_name, table_name)
);

ALTER TABLE public.connection_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own connection schemas"
  ON public.connection_schemas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.database_connections dc
      WHERE dc.id = connection_id AND dc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own connection schemas"
  ON public.connection_schemas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.database_connections dc
      WHERE dc.id = connection_id AND dc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own connection schemas"
  ON public.connection_schemas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.database_connections dc
      WHERE dc.id = connection_id AND dc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own connection schemas"
  ON public.connection_schemas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.database_connections dc
      WHERE dc.id = connection_id AND dc.user_id = auth.uid()
    )
  );

-- ─── Updated-at trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.database_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
