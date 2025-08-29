-- Add explicit foreign key relationship between posts and user_profiles
-- This ensures Supabase generates the correct TypeScript types for joins

-- Drop existing constraint if it exists
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_user_profiles_fkey;

-- Add foreign key constraint to establish the relationship in the schema
-- This allows posts.user_id to properly join with user_profiles.id
ALTER TABLE public.posts 
ADD CONSTRAINT posts_user_id_user_profiles_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.user_profiles(id) 
ON DELETE CASCADE;

-- Update the database comment to document this relationship
COMMENT ON CONSTRAINT posts_user_id_user_profiles_fkey ON public.posts IS 
'Foreign key linking posts to user_profiles for proper join relationships';

-- Also add the same relationship for comments table
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_user_profiles_fkey;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_user_id_user_profiles_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.user_profiles(id) 
ON DELETE CASCADE;

COMMENT ON CONSTRAINT comments_user_id_user_profiles_fkey ON public.comments IS 
'Foreign key linking comments to user_profiles for proper join relationships';

-- Add relationship for reactions table as well
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_user_id_user_profiles_fkey;

ALTER TABLE public.reactions 
ADD CONSTRAINT reactions_user_id_user_profiles_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.user_profiles(id) 
ON DELETE CASCADE;

COMMENT ON CONSTRAINT reactions_user_id_user_profiles_fkey ON public.reactions IS 
'Foreign key linking reactions to user_profiles for proper join relationships';