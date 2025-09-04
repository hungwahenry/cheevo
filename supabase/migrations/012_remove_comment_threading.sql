-- =============================================
-- Remove Comment Threading System Migration
-- =============================================
-- This migration removes all threading logic and converts to flat, 
-- mention-based comment system (Instagram-style)

-- =============================================
-- 1. DROP THREADING TRIGGERS AND FUNCTIONS
-- =============================================

-- Drop the thread depth enforcement trigger
DROP TRIGGER IF EXISTS trigger_enforce_comment_thread_depth ON public.comments;

-- Drop the thread depth function
DROP FUNCTION IF EXISTS enforce_comment_thread_depth() CASCADE;

-- =============================================
-- 2. REMOVE THREADING FIELDS FROM COMMENTS TABLE
-- =============================================

-- Drop the threading-related columns
ALTER TABLE public.comments 
  DROP COLUMN IF EXISTS parent_comment_id CASCADE,
  DROP COLUMN IF EXISTS thread_depth CASCADE;

-- =============================================
-- 3. DROP THREADING INDEXES
-- =============================================

-- Drop the parent comment index (no longer needed)
DROP INDEX IF EXISTS comments_parent_comment_id_idx;

-- =============================================
-- 4. ADD NEW FIELDS FOR MENTION SYSTEM
-- =============================================

-- Add field to store mentioned users (for future mention parsing)
ALTER TABLE public.comments 
  ADD COLUMN mentioned_users JSONB DEFAULT '[]'::jsonb;

-- Add index for mentioned users queries
CREATE INDEX IF NOT EXISTS comments_mentioned_users_idx ON public.comments USING GIN (mentioned_users);

-- =============================================
-- 5. REMOVE THREADING CONFIGURATION
-- =============================================

-- Remove the comment thread depth configuration (no longer needed)
DELETE FROM public.app_config WHERE key = 'comment_thread_depth';

-- =============================================
-- 6. UPDATE RLS POLICIES (Remove threading references)
-- =============================================

-- The existing RLS policies should continue to work since we're only removing fields
-- No policy changes needed as we're not changing the core access patterns

-- =============================================
-- 7. CLEAN UP ANY ORPHANED DATA (Optional)
-- =============================================

-- Since we're removing threading, we don't need to worry about orphaned comments
-- All comments will become top-level comments, which is exactly what we want

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Comments are now flat with no threading
-- Ready for Instagram-style mention-based replies