-- Comprehensive fix for view tracking system
-- Addresses all trigger conflicts and missing dependencies

-- 1. Drop all conflicting triggers and functions
DROP TRIGGER IF EXISTS trigger_update_post_views_count ON public.post_views;
DROP TRIGGER IF EXISTS post_views_calculate_trending ON public.post_views;
DROP TRIGGER IF EXISTS trigger_track_post_view ON public.post_views;
DROP FUNCTION IF EXISTS update_post_views_count() CASCADE;
DROP FUNCTION IF EXISTS trigger_recalc_trending_on_view() CASCADE;
DROP FUNCTION IF EXISTS track_post_view() CASCADE;

-- 2. Drop the config table from migration 009 (unnecessary bloat)
DROP TABLE IF EXISTS public.view_tracking_config CASCADE;

-- 3. Create unified view tracking function that handles everything
CREATE OR REPLACE FUNCTION handle_post_view()
RETURNS TRIGGER AS $$
DECLARE
    recent_view_exists BOOLEAN := FALSE;
    views_count_before INTEGER;
    views_count_after INTEGER;
BEGIN
    -- Check for recent view by same user within 24 hours (hardcoded, no bloat)
    SELECT EXISTS(
        SELECT 1 FROM public.post_views 
        WHERE post_id = NEW.post_id 
        AND user_id = NEW.user_id 
        AND viewed_at > (NOW() - INTERVAL '24 hours')
        AND id != NEW.id -- Exclude current insert
    ) INTO recent_view_exists;
    
    -- Only increment counter if this is a new unique view
    IF NOT recent_view_exists THEN
        -- Get current count
        SELECT views_count INTO views_count_before 
        FROM public.posts 
        WHERE id = NEW.post_id;
        
        -- Update views count
        UPDATE public.posts 
        SET views_count = views_count + 1
        WHERE id = NEW.post_id;
        
        -- Get new count for trending calculation trigger
        SELECT views_count INTO views_count_after 
        FROM public.posts 
        WHERE id = NEW.post_id;
        
        -- The posts table trigger will handle trending recalculation 
        -- when views_count changes (migration 008 logic)
    END IF;
    
    RETURN NEW; -- Always allow insert for tracking
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create single unified trigger
CREATE TRIGGER handle_post_view_trigger
    AFTER INSERT ON public.post_views
    FOR EACH ROW EXECUTE FUNCTION handle_post_view();

-- 5. Ensure posts table trending trigger exists (recreate if missing)
DROP TRIGGER IF EXISTS posts_calculate_trending ON public.posts;
CREATE TRIGGER posts_calculate_trending
    AFTER INSERT OR UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_post_trending();

-- 6. Grant permissions (no new tables, just function)
-- No additional grants needed - uses existing tables