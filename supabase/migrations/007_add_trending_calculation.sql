-- Add automated trending calculation for posts
-- This integrates with the existing user stats system and config values

-- Function to calculate post trending score and status
CREATE OR REPLACE FUNCTION calculate_post_trending(post_id_param BIGINT)
RETURNS VOID AS $$
DECLARE
    post_record RECORD;
    config_record RECORD;
    hours_old DECIMAL;
    time_decay DECIMAL;
    base_score DECIMAL;
    trending_threshold DECIMAL;
    new_trending_score DECIMAL;
    new_is_trending BOOLEAN;
BEGIN
    -- Get post data
    SELECT id, reactions_count, views_count, created_at
    INTO post_record
    FROM public.posts 
    WHERE id = post_id_param;
    
    -- Exit if post doesn't exist
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get trending configuration from app_config, with defaults
    SELECT 
        COALESCE((SELECT value::TEXT::INTEGER FROM public.app_config WHERE key = 'trending_window_hours'), 24) as window_hours,
        COALESCE((SELECT value::TEXT::INTEGER FROM public.app_config WHERE key = 'trending_min_reactions'), 5) as min_reactions,
        COALESCE((SELECT value::TEXT::DECIMAL FROM public.app_config WHERE key = 'trending_boost_factor'), 1.5) as boost_factor,
        COALESCE((SELECT value::TEXT::DECIMAL FROM public.app_config WHERE key = 'trending_decay_rate'), 0.8) as decay_rate
    INTO config_record;
    
    -- Calculate how many hours old the post is
    hours_old := EXTRACT(EPOCH FROM (NOW() - post_record.created_at)) / 3600.0;
    
    -- Don't calculate trending for posts older than the window
    IF hours_old > config_record.window_hours THEN
        new_trending_score := 0;
        new_is_trending := FALSE;
    ELSE
        -- Calculate time decay (exponential decay based on hours)
        time_decay := POWER(config_record.decay_rate, hours_old);
        
        -- Base score from engagement (reactions weighted more than views)
        base_score := (post_record.reactions_count * 10) + (COALESCE(post_record.views_count, 0) * 0.1);
        
        -- Apply boost factor and time decay
        new_trending_score := (base_score * config_record.boost_factor * time_decay);
        
        -- Determine if trending (must meet minimum reactions and have positive score)
        new_is_trending := (
            post_record.reactions_count >= config_record.min_reactions 
            AND new_trending_score > 0
            AND hours_old <= config_record.window_hours
        );
    END IF;
    
    -- Update the post
    UPDATE public.posts 
    SET 
        trending_score = ROUND(new_trending_score, 6),
        is_trending = new_is_trending,
        updated_at = NOW()
    WHERE id = post_id_param;
    
    -- Log the calculation for debugging
    INSERT INTO public.app_config (key, value, category, description)
    VALUES (
        'last_trending_calc_' || post_id_param, 
        jsonb_build_object(
            'post_id', post_id_param,
            'reactions', post_record.reactions_count,
            'views', post_record.views_count,
            'hours_old', hours_old,
            'time_decay', time_decay,
            'base_score', base_score,
            'trending_score', new_trending_score,
            'is_trending', new_is_trending,
            'calculated_at', NOW()
        ),
        'debug',
        'Last trending calculation debug info'
    )
    ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = NOW();
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger function to automatically calculate trending when posts change
CREATE OR REPLACE FUNCTION trigger_calculate_post_trending()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate trending for the affected post
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM calculate_post_trending(NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- No need to calculate for deleted posts
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for when reactions change
CREATE OR REPLACE FUNCTION trigger_recalc_trending_on_reaction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM calculate_post_trending(NEW.post_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM calculate_post_trending(OLD.post_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for when post views change
CREATE OR REPLACE FUNCTION trigger_recalc_trending_on_view()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_post_trending(NEW.post_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to automatically calculate trending

-- Trigger for post changes (content updates, etc)
DROP TRIGGER IF EXISTS posts_calculate_trending ON public.posts;
CREATE TRIGGER posts_calculate_trending
    AFTER INSERT OR UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_post_trending();

-- Trigger for reaction changes
DROP TRIGGER IF EXISTS reactions_calculate_trending ON public.reactions;
CREATE TRIGGER reactions_calculate_trending
    AFTER INSERT OR DELETE ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION trigger_recalc_trending_on_reaction();

-- Trigger for view changes
DROP TRIGGER IF EXISTS post_views_calculate_trending ON public.post_views;
CREATE TRIGGER post_views_calculate_trending
    AFTER INSERT ON public.post_views
    FOR EACH ROW EXECUTE FUNCTION trigger_recalc_trending_on_view();

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_post_trending(BIGINT) TO service_role;