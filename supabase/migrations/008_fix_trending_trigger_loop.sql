-- Fix infinite loop in trending calculation triggers

-- Drop the problematic trigger that causes infinite loops
DROP TRIGGER IF EXISTS posts_calculate_trending ON public.posts;

-- Create a better trigger that only fires on relevant changes (not trending field updates)
CREATE OR REPLACE FUNCTION trigger_calculate_post_trending()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate trending on INSERT or when non-trending fields change
    IF TG_OP = 'INSERT' THEN
        PERFORM calculate_post_trending(NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only recalculate if content-related fields changed (not trending fields)
        IF (OLD.content != NEW.content OR 
            OLD.reactions_count != NEW.reactions_count OR 
            OLD.comments_count != NEW.comments_count OR 
            OLD.views_count != NEW.views_count) THEN
            PERFORM calculate_post_trending(NEW.id);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the improved logic
CREATE TRIGGER posts_calculate_trending
    AFTER INSERT OR UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_post_trending();

-- Also update the calculate_post_trending function to not update updated_at
-- (which was causing additional trigger fires)
CREATE OR REPLACE FUNCTION calculate_post_trending(post_id_param BIGINT)
RETURNS VOID AS $$
DECLARE
    post_record RECORD;
    config_record RECORD;
    hours_old DECIMAL;
    time_decay DECIMAL;
    base_score DECIMAL;
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
    
    -- Update ONLY trending fields, don't update updated_at to avoid trigger loops
    UPDATE public.posts 
    SET 
        trending_score = ROUND(new_trending_score, 6),
        is_trending = new_is_trending
    WHERE id = post_id_param;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;