-- Fix reports table to prevent duplicate reports with proper database constraints
-- This prevents race conditions between client and edge function

-- Add unique constraint to prevent duplicate reports
-- This will enforce uniqueness at the database level
ALTER TABLE public.reports 
ADD CONSTRAINT reports_unique_per_user_content 
UNIQUE (reporter_user_id, reported_content_type, reported_content_id);

-- Add index for performance on common queries
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports(created_at);
CREATE INDEX IF NOT EXISTS reports_composite_lookup_idx ON public.reports(reporter_user_id, reported_content_type, reported_content_id);