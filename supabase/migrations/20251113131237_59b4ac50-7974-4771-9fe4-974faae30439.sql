-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin');

-- Create enum for complaint status
CREATE TYPE complaint_status AS ENUM ('pending', 'seen', 'resolving', 'resolved');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  id_card_number TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  image_urls TEXT[],
  video_urls TEXT[],
  status complaint_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Complaints policies
CREATE POLICY "Users can view their own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view complaint by ticket"
  ON public.complaints FOR SELECT
  USING (true);

CREATE POLICY "Admin can view all complaints"
  ON public.complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update all complaints"
  ON public.complaints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function to generate unique ticket
CREATE OR REPLACE FUNCTION public.generate_ticket()
RETURNS TEXT AS $$
DECLARE
  ticket TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ticket in format: BT-XXXXXX
    ticket := 'BT-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- Check if ticket already exists
    SELECT EXISTS(SELECT 1 FROM public.complaints WHERE complaints.ticket = ticket) INTO exists;
    
    -- If ticket doesn't exist, return it
    IF NOT exists THEN
      RETURN ticket;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, id_card_number, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'id_card_number',
    -- Determine role based on ID card number pattern
    -- Students: BTS-XXXXX, Staff: BTF-XXXXX
    CASE 
      WHEN NEW.raw_user_meta_data->>'id_card_number' LIKE 'BTS-%' THEN 'student'::user_role
      WHEN NEW.raw_user_meta_data->>'id_card_number' LIKE 'BTF-%' THEN 'staff'::user_role
      ELSE 'student'::user_role
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for complaint files
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-files', 'complaint-files', true);

-- Storage policies for complaint files
CREATE POLICY "Users can upload their complaint files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view complaint files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-files');

CREATE POLICY "Users can delete their complaint files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'complaint-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable realtime for complaints table
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;