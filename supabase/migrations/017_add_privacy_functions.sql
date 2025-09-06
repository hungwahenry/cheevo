-- =============================================
-- Privacy Enforcement Functions Migration
-- =============================================
-- Creates helper functions for privacy enforcement across the app

-- 1. Check if viewer can see target user's profile
CREATE OR REPLACE FUNCTION can_view_profile(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_profile_visibility TEXT;
    viewer_university_id INTEGER;
    target_university_id INTEGER;
    is_blocked BOOLEAN;
BEGIN
    -- Users can always view their own profile
    IF viewer_id = target_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if target user has blocked the viewer
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE blocker_user_id = target_id 
        AND blocked_user_id = viewer_id
    ) INTO is_blocked;
    
    IF is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Check if viewer has blocked the target (they shouldn't see their profile)
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE blocker_user_id = viewer_id 
        AND blocked_user_id = target_id
    ) INTO is_blocked;
    
    IF is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Get target user's profile visibility setting
    SELECT profile_visibility INTO target_profile_visibility
    FROM public.user_profiles
    WHERE id = target_id;
    
    -- If profile doesn't exist or is set to 'nobody', deny access
    IF target_profile_visibility IS NULL OR target_profile_visibility = 'nobody' THEN
        RETURN FALSE;
    END IF;
    
    -- If profile is set to 'everyone', allow access
    IF target_profile_visibility = 'everyone' THEN
        RETURN TRUE;
    END IF;
    
    -- If profile is set to 'university', check if both users are from same university
    IF target_profile_visibility = 'university' THEN
        SELECT university_id INTO viewer_university_id
        FROM public.user_profiles
        WHERE id = viewer_id;
        
        SELECT university_id INTO target_university_id
        FROM public.user_profiles
        WHERE id = target_id;
        
        RETURN viewer_university_id = target_university_id;
    END IF;
    
    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Check if viewer can see target user's posts (inherits from profile visibility)
CREATE OR REPLACE FUNCTION can_view_posts(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Same logic as profile visibility for now
    RETURN can_view_profile(viewer_id, target_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Check if viewer can react to target user's posts
CREATE OR REPLACE FUNCTION can_react_to_posts(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_who_can_react TEXT;
    viewer_university_id INTEGER;
    target_university_id INTEGER;
    is_blocked BOOLEAN;
BEGIN
    -- Users can react to their own posts
    IF viewer_id = target_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if either user has blocked the other
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE (blocker_user_id = target_id AND blocked_user_id = viewer_id)
        OR (blocker_user_id = viewer_id AND blocked_user_id = target_id)
    ) INTO is_blocked;
    
    IF is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Must be able to view posts first
    IF NOT can_view_posts(viewer_id, target_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Get target user's reaction permission setting
    SELECT who_can_react INTO target_who_can_react
    FROM public.user_profiles
    WHERE id = target_id;
    
    -- If setting doesn't exist, default to 'everyone'
    IF target_who_can_react IS NULL THEN
        target_who_can_react := 'everyone';
    END IF;
    
    -- If reactions are open to 'everyone', allow
    IF target_who_can_react = 'everyone' THEN
        RETURN TRUE;
    END IF;
    
    -- If reactions are limited to 'university', check same university
    IF target_who_can_react = 'university' THEN
        SELECT university_id INTO viewer_university_id
        FROM public.user_profiles
        WHERE id = viewer_id;
        
        SELECT university_id INTO target_university_id
        FROM public.user_profiles
        WHERE id = target_id;
        
        RETURN viewer_university_id = target_university_id;
    END IF;
    
    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Check if viewer can comment on target user's posts
CREATE OR REPLACE FUNCTION can_comment_on_posts(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    target_who_can_comment TEXT;
    viewer_university_id INTEGER;
    target_university_id INTEGER;
    is_blocked BOOLEAN;
BEGIN
    -- Users can comment on their own posts
    IF viewer_id = target_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if either user has blocked the other
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE (blocker_user_id = target_id AND blocked_user_id = viewer_id)
        OR (blocker_user_id = viewer_id AND blocked_user_id = target_id)
    ) INTO is_blocked;
    
    IF is_blocked THEN
        RETURN FALSE;
    END IF;
    
    -- Must be able to view posts first
    IF NOT can_view_posts(viewer_id, target_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Get target user's comment permission setting
    SELECT who_can_comment INTO target_who_can_comment
    FROM public.user_profiles
    WHERE id = target_id;
    
    -- If setting doesn't exist, default to 'everyone'
    IF target_who_can_comment IS NULL THEN
        target_who_can_comment := 'everyone';
    END IF;
    
    -- If comments are open to 'everyone', allow
    IF target_who_can_comment = 'everyone' THEN
        RETURN TRUE;
    END IF;
    
    -- If comments are limited to 'university', check same university
    IF target_who_can_comment = 'university' THEN
        SELECT university_id INTO viewer_university_id
        FROM public.user_profiles
        WHERE id = viewer_id;
        
        SELECT university_id INTO target_university_id
        FROM public.user_profiles
        WHERE id = target_id;
        
        RETURN viewer_university_id = target_university_id;
    END IF;
    
    -- Default deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get privacy-filtered post IDs for feeds
CREATE OR REPLACE FUNCTION get_visible_post_ids(viewer_id UUID, scope_filter TEXT DEFAULT 'all')
RETURNS TABLE(post_id BIGINT) AS $$
DECLARE
    viewer_university_id INTEGER;
BEGIN
    -- Get viewer's university for filtering
    SELECT university_id INTO viewer_university_id
    FROM public.user_profiles
    WHERE id = viewer_id;
    
    RETURN QUERY
    SELECT p.id
    FROM public.posts p
    INNER JOIN public.user_profiles up ON p.user_id = up.id
    WHERE 
        -- Post is not flagged
        p.is_flagged = false
        -- User can view this user's posts
        AND can_view_posts(viewer_id, p.user_id)
        -- Apply scope filtering if specified
        AND (
            scope_filter = 'all' 
            OR (scope_filter = 'campus' AND p.university_id = viewer_university_id)
            OR (scope_filter = 'global')
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Get privacy-filtered reactions for a post
CREATE OR REPLACE FUNCTION get_visible_reactions(viewer_id UUID, post_id_param BIGINT)
RETURNS TABLE(
    reaction_id BIGINT,
    reaction_user_id UUID,
    reaction_created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.user_id, r.created_at
    FROM public.reactions r
    INNER JOIN public.user_profiles up ON r.user_id = up.id
    WHERE 
        r.post_id = post_id_param
        -- Don't show reactions from blocked users
        AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_user_id = viewer_id AND b.blocked_user_id = r.user_id)
            OR (b.blocker_user_id = r.user_id AND b.blocked_user_id = viewer_id)
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Get privacy-filtered comments for a post  
CREATE OR REPLACE FUNCTION get_visible_comments(viewer_id UUID, post_id_param BIGINT)
RETURNS TABLE(
    comment_id BIGINT,
    comment_content TEXT,
    comment_user_id UUID,
    comment_created_at TIMESTAMPTZ,
    comment_updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.content, c.user_id, c.created_at, c.updated_at
    FROM public.comments c
    INNER JOIN public.user_profiles up ON c.user_id = up.id
    WHERE 
        c.post_id = post_id_param
        -- Don't show comments from blocked users
        AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_user_id = viewer_id AND b.blocked_user_id = c.user_id)
            OR (b.blocker_user_id = c.user_id AND b.blocked_user_id = viewer_id)
        )
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions for privacy functions
GRANT EXECUTE ON FUNCTION can_view_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_profile(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION can_view_posts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_posts(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION can_react_to_posts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_react_to_posts(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION can_comment_on_posts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_comment_on_posts(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_visible_post_ids(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_visible_post_ids(UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION get_visible_reactions(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_visible_reactions(UUID, BIGINT) TO service_role;

GRANT EXECUTE ON FUNCTION get_visible_comments(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_visible_comments(UUID, BIGINT) TO service_role;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_blocked_users_lookup ON public.blocked_users(blocker_user_id, blocked_user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_user_profiles_visibility ON public.user_profiles(id, profile_visibility, who_can_react, who_can_comment);
CREATE INDEX IF NOT EXISTS idx_privacy_posts_user_university ON public.posts(user_id, university_id, is_flagged);
CREATE INDEX IF NOT EXISTS idx_privacy_reactions_post_user ON public.reactions(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_comments_post_user ON public.comments(post_id, user_id);