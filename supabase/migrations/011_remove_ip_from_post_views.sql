-- Remove IP address tracking from post_views table
-- This field is unnecessary and was causing insert errors

ALTER TABLE public.post_views 
DROP COLUMN IF EXISTS ip_address;