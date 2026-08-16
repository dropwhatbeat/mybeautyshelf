CREATE TYPE public.skin_type AS ENUM ('dry','oily','combination','normal','sensitive');
CREATE TYPE public.undertone AS ENUM ('cool','neutral','warm');
CREATE TYPE public.product_category AS ENUM ('cleanser','serum','moisturiser','spf','treatment','makeup','other');
CREATE TYPE public.product_status AS ENUM ('active','finished','discarded');
CREATE TYPE public.review_verdict AS ENUM ('repurchase','undecided','never_again');
CREATE TYPE public.time_of_day AS ENUM ('am','pm');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  skin_type public.skin_type,
  undertone public.undertone,
  fitzpatrick INT CHECK (fitzpatrick BETWEEN 1 AND 6),
  concerns TEXT[] NOT NULL DEFAULT '{}',
  season_result TEXT,
  season_payload JSONB,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  category public.product_category NOT NULL DEFAULT 'other',
  image_front_url TEXT,
  image_back_url TEXT,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  pao_months INT,
  date_opened DATE,
  date_added TIMESTAMPTZ NOT NULL DEFAULT now(),
  size_ml NUMERIC,
  status public.product_status NOT NULL DEFAULT 'active',
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_own" ON public.products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX products_user_idx ON public.products(user_id);

CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  verdict public.review_verdict NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_own" ON public.product_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX reviews_product_idx ON public.product_reviews(product_id);

CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_of_day public.time_of_day NOT NULL,
  product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, time_of_day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO authenticated;
GRANT ALL ON public.routines TO service_role;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routines_own" ON public.routines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();