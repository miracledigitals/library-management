-- Migration to add automatic profile creation on user sign up

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  member_id TEXT;
BEGIN
  -- Determine user role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patron');
  
  -- Create profile record
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', ''),
    user_role
  );
  
  -- Create patron record for patron users (not admin/librarian)
  IF user_role = 'patron' THEN
    -- Generate a unique member ID
    member_id := 'MB' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(CAST(FLOOR(RANDOM() * 1000) AS TEXT), 3, '0');
    
    INSERT INTO public.patrons (
      member_id,
      email,
      first_name,
      last_name,
      membership_status,
      membership_type
    ) VALUES (
      member_id,
      NEW.email,
      COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), ''),
      COALESCE(split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2), ''),
      'active',
      'standard'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on sign up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();