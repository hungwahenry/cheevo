-- =============================================
-- Fix Simple Two-Level Comment System Migration
-- =============================================
-- This migration corrects the comment system to support Instagram-style
-- 2-level comments: main comments + flat replies with @mentions

-- =============================================
-- 1. RE-ADD PARENT_COMMENT_ID (We need this for 2 levels)
-- =============================================

-- Add back parent_comment_id for simple 2-level structure
ALTER TABLE public.comments 
  ADD COLUMN parent_comment_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add back the parent comment index
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON public.comments(parent_comment_id);

-- =============================================
-- 2. REMOVE MENTIONED_USERS (Not needed - just store in content)
-- =============================================

-- Remove the mentioned_users field (we'll just store @mentions in content)
ALTER TABLE public.comments 
  DROP COLUMN IF EXISTS mentioned_users CASCADE;

-- Drop the mentioned users index
DROP INDEX IF EXISTS comments_mentioned_users_idx;

-- =============================================
-- 3. ADD CONSTRAINT FOR MAX 2 LEVELS
-- =============================================

-- Create function to enforce max 2 levels (main comment + replies only)
CREATE OR REPLACE FUNCTION enforce_two_level_comments()
RETURNS TRIGGER AS $$
BEGIN
    -- If this has a parent, make sure parent has no parent (max 2 levels)
    IF NEW.parent_comment_id IS NOT NULL THEN
        -- Check if parent comment has a parent (would make this 3rd level)
        IF EXISTS (
            SELECT 1 FROM public.comments 
            WHERE id = NEW.parent_comment_id 
            AND parent_comment_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Comments can only be 2 levels deep (main comment + replies)';
        END IF;
        
        -- Ensure parent exists and belongs to same post
        IF NOT EXISTS (
            SELECT 1 FROM public.comments 
            WHERE id = NEW.parent_comment_id 
            AND post_id = NEW.post_id
        ) THEN
            RAISE EXCEPTION 'Parent comment must exist and belong to same post';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce 2-level limit
CREATE TRIGGER trigger_enforce_two_level_comments
    BEFORE INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION enforce_two_level_comments();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Comments now support Instagram-style 2-level structure:
-- - Main comments (parent_comment_id = NULL)
-- - Replies to main comments (parent_comment_id = main_comment_id)
-- - @mentions stored as part of content text
-- - No deep threading beyond 2 levels