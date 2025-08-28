-- Fix username availability function - correct column name
CREATE OR REPLACE FUNCTION check_username_availability(username_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if username exists in raw_user_meta_data (correct column name)
  RETURN NOT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE LOWER(raw_user_meta_data->>'username') = LOWER(username_to_check)
  );
END;
$$;