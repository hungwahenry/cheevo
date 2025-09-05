-- =============================================
-- Remove Two-Level Comment Constraint Migration
-- =============================================
-- This migration removes the database constraint that prevents
-- replies to replies, allowing flat comment structure with @mentions

-- Drop the trigger that enforces 2-level limit
DROP TRIGGER IF EXISTS trigger_enforce_two_level_comments ON public.comments;

-- Drop the function that enforces 2-level limit
DROP FUNCTION IF EXISTS enforce_two_level_comments();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Comments now allow any parent_comment_id relationship
-- Frontend handles display with @mentions for context