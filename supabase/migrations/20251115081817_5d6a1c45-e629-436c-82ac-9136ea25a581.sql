-- Step 1: Create app_role enum
CREATE TYPE public.app_role AS ENUM ('student', 'staff', 'admin');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 4: Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Update RLS policies on profiles table
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Update RLS policies on complaints table
DROP POLICY IF EXISTS "Admin can view all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admin can update all complaints" ON public.complaints;

CREATE POLICY "Admin can view all complaints"
  ON public.complaints FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all complaints"
  ON public.complaints FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 7: Add RLS policy for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Step 8: Update handle_new_user function to insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_value app_role;
BEGIN
  -- Determine role from ID card pattern
  user_role_value := CASE 
    WHEN NEW.raw_user_meta_data->>'id_card_number' LIKE 'BTS-%' THEN 'student'::app_role
    WHEN NEW.raw_user_meta_data->>'id_card_number' LIKE 'BTF-%' THEN 'staff'::app_role
    ELSE 'student'::app_role
  END;

  -- Insert profile (keeping role column for backward compatibility)
  INSERT INTO public.profiles (id, name, email, id_card_number, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'id_card_number',
    CASE 
      WHEN NEW.raw_user_meta_data->>'id_card_number' LIKE 'BTS-%' THEN 'student'::user_role
      WHEN NEW.raw_user_meta_data->>'id_card_number' LIKE 'BTF-%' THEN 'staff'::user_role
      ELSE 'student'::user_role
    END
  );

  -- Insert role into user_roles table (this is what RLS policies check)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role_value);

  RETURN NEW;
END;
$$;