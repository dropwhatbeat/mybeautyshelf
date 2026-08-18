CREATE TABLE public.skin_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  hydration smallint NOT NULL CHECK (hydration BETWEEN 0 AND 100),
  fine_lines smallint NOT NULL CHECK (fine_lines BETWEEN 0 AND 100),
  pores smallint NOT NULL CHECK (pores BETWEEN 0 AND 100),
  overall smallint NOT NULL CHECK (overall BETWEEN 0 AND 100),
  notes jsonb,
  season text,
  undertone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX skin_checks_user_created_idx ON public.skin_checks (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skin_checks TO authenticated;
GRANT ALL ON public.skin_checks TO service_role;
ALTER TABLE public.skin_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own skin checks" ON public.skin_checks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);