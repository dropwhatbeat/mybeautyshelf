ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_range text,
  ADD COLUMN IF NOT EXISTS spf_habit text,
  ADD COLUMN IF NOT EXISTS sensitivity text,
  ADD COLUMN IF NOT EXISTS avoid_list text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pregnancy text,
  ADD COLUMN IF NOT EXISTS face_shape text;

ALTER TABLE public.skin_checks
  ADD COLUMN IF NOT EXISTS redness smallint,
  ADD COLUMN IF NOT EXISTS evenness smallint,
  ADD COLUMN IF NOT EXISTS oil_tzone smallint,
  ADD COLUMN IF NOT EXISTS oil_cheeks smallint,
  ADD COLUMN IF NOT EXISTS under_eye smallint,
  ADD COLUMN IF NOT EXISTS face_shape text,
  ADD COLUMN IF NOT EXISTS fitzpatrick smallint;