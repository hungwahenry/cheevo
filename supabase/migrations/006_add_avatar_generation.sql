-- Add avatar generation to user profile creation
-- Updates the create_user_profile function to automatically generate DiceBear avatars

-- Helper function to generate avatar URL
CREATE OR REPLACE FUNCTION generate_avatar_url(seed TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Generate DiceBear thumbs style avatar URL
    RETURN 'https://api.dicebear.com/7.x/thumbs/svg?seed=' || 
           encode(seed::bytea, 'escape') || 
           '&backgroundColor=transparent&size=200';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the create_user_profile function to include avatar generation
CREATE OR REPLACE FUNCTION create_user_profile(
    user_uuid UUID,
    username_param TEXT,
    email_param TEXT,
    university_id_param BIGINT
)
RETURNS VOID AS $$
DECLARE
    avatar_url TEXT;
BEGIN
    -- Generate avatar URL using user UUID as seed for consistency
    avatar_url := generate_avatar_url(user_uuid::TEXT);
    
    -- Insert user profile with generated avatar
    INSERT INTO public.user_profiles (
        id, 
        username, 
        email, 
        university_id,
        avatar_url
    ) VALUES (
        user_uuid,
        username_param,
        email_param,
        university_id_param,
        avatar_url
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;