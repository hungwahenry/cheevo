-- Create function to check username availability
CREATE OR REPLACE FUNCTION check_username_availability(username_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if username exists in user_metadata
  RETURN NOT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE LOWER(user_metadata->>'username') = LOWER(username_to_check)
  );
END;
$$;