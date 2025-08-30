-- Replace the dumb view counter with intelligent deduplication at database level
-- This ensures ALL parts of the application get consistent, deduplicated view tracking

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_post_views_count ON public.post_views;
DROP FUNCTION IF EXISTS update_post_views_count() CASCADE;

-- Create intelligent view tracking function
CREATE OR REPLACE FUNCTION track_post_view()
RETURNS TRIGGER AS $$
DECLARE
    recent_view_exists BOOLEAN := FALSE;
    view_window_hours INTEGER := 24; -- Configurable deduplication window
BEGIN
    -- Check for recent view by same user within the time window
    IF NEW.user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.post_views 
            WHERE post_id = NEW.post_id 
            AND user_id = NEW.user_id 
            AND viewed_at > (NOW() - INTERVAL '1 hour' * view_window_hours)
            AND id != NEW.id -- Exclude the current insert
        ) INTO recent_view_exists;
    ELSE
        -- For anonymous users (if any), use IP-based deduplication with shorter window
        IF NEW.ip_address IS NOT NULL THEN
            SELECT EXISTS(
                SELECT 1 FROM public.post_views 
                WHERE post_id = NEW.post_id 
                AND ip_address = NEW.ip_address 
                AND user_id IS NULL
                AND viewed_at > (NOW() - INTERVAL '1 hour') -- 1 hour for anonymous
                AND id != NEW.id
            ) INTO recent_view_exists;
        END IF;
    END IF;
    
    -- Only increment counter if this is a new unique view
    IF NOT recent_view_exists THEN
        UPDATE public.posts 
        SET views_count = views_count + 1
        WHERE id = NEW.post_id;
        
        -- Log for debugging (optional)
        -- RAISE NOTICE 'View tracked for post %, user %, new count updated', NEW.post_id, NEW.user_id;
    ELSE
        -- Log duplicate view (optional)
        -- RAISE NOTICE 'Duplicate view ignored for post %, user %', NEW.post_id, NEW.user_id;
    END IF;
    
    RETURN NEW; -- Always return NEW to allow the insert (we track all events but only count unique ones)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_track_post_view
    AFTER INSERT ON public.post_views
    FOR EACH ROW EXECUTE FUNCTION track_post_view();

-- Add configuration table for view tracking settings
CREATE TABLE IF NOT EXISTS public.view_tracking_config (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value INTEGER NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default configuration
INSERT INTO public.view_tracking_config (key, value, description) VALUES
    ('deduplication_hours', 24, 'Hours to deduplicate views for same user/post'),
    ('anonymous_deduplication_hours', 1, 'Hours to deduplicate anonymous views by IP'),
    ('trending_view_weight', 1, 'Weight of views in trending calculation')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.view_tracking_config TO authenticated;
GRANT ALL ON public.view_tracking_config TO service_role;