-- =============================================
-- Notification Settings Migration
-- =============================================
-- Adds notification preferences to user_profiles table

-- 1. Add notification settings columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS social_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS content_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS trending_notifications BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS community_notifications BOOLEAN DEFAULT true;

-- 2. Create function to get user notification settings
CREATE OR REPLACE FUNCTION get_user_notification_settings(user_id UUID)
RETURNS TABLE (
    social_notifications BOOLEAN,
    content_notifications BOOLEAN,
    trending_notifications BOOLEAN,
    community_notifications BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.social_notifications,
        up.content_notifications,
        up.trending_notifications,
        up.community_notifications
    FROM public.user_profiles up
    WHERE up.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to update user notification settings
CREATE OR REPLACE FUNCTION update_user_notification_settings(
    user_id UUID,
    social_notifs BOOLEAN DEFAULT NULL,
    content_notifs BOOLEAN DEFAULT NULL,
    trending_notifs BOOLEAN DEFAULT NULL,
    community_notifs BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.user_profiles
    SET 
        social_notifications = COALESCE(social_notifs, social_notifications),
        content_notifications = COALESCE(content_notifs, content_notifications),
        trending_notifications = COALESCE(trending_notifs, trending_notifications),
        community_notifications = COALESCE(community_notifs, community_notifications),
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions for notification functions
GRANT EXECUTE ON FUNCTION get_user_notification_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_settings(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION update_user_notification_settings(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_notification_settings(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO service_role;