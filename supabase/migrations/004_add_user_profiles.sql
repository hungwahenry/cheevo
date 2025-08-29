-- Create user_profiles table to centralize user data
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 20),
    email TEXT NOT NULL,
    university_id BIGINT NOT NULL REFERENCES public.universities(id),
    
    -- Profile info
    bio TEXT CHECK (LENGTH(bio) <= 160),
    avatar_url TEXT,
    
    -- Cached stats (updated via triggers/functions)
    posts_count INTEGER DEFAULT 0,
    reactions_received INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    trending_score DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Indexes for performance
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role can manage all profiles
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.user_profiles;
CREATE POLICY "Service role can manage profiles" ON public.user_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS user_profiles_university_id_idx ON public.user_profiles(university_id);
CREATE INDEX IF NOT EXISTS user_profiles_created_at_idx ON public.user_profiles(created_at);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();

-- Function to update user stats (called by triggers)
CREATE OR REPLACE FUNCTION update_user_stats(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    stats_record RECORD;
BEGIN
    -- Calculate user stats
    SELECT 
        COALESCE(COUNT(p.id), 0) as posts_count,
        COALESCE(SUM(p.reactions_count), 0) as reactions_received,
        COALESCE(SUM(p.views_count), 0) as total_views,
        COALESCE(SUM(p.trending_score), 0) as trending_score,
        (SELECT COALESCE(COUNT(c.id), 0) FROM public.comments c WHERE c.user_id = user_uuid AND c.is_flagged = false) as comments_count
    INTO stats_record
    FROM public.posts p 
    WHERE p.user_id = user_uuid AND p.is_flagged = false;
    
    -- Update user profile stats
    UPDATE public.user_profiles 
    SET 
        posts_count = stats_record.posts_count,
        reactions_received = stats_record.reactions_received,
        total_views = stats_record.total_views,
        trending_score = ROUND(stats_record.trending_score, 2),
        comments_count = stats_record.comments_count,
        updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to update user stats when posts/comments/reactions change
CREATE OR REPLACE FUNCTION trigger_update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_user_stats(NEW.user_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM update_user_stats(NEW.user_id);
        IF OLD.user_id != NEW.user_id THEN
            PERFORM update_user_stats(OLD.user_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_user_stats(OLD.user_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to posts
DROP TRIGGER IF EXISTS posts_update_user_stats ON public.posts;
CREATE TRIGGER posts_update_user_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

-- Apply triggers to comments  
DROP TRIGGER IF EXISTS comments_update_user_stats ON public.comments;
CREATE TRIGGER comments_update_user_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

-- Apply triggers to reactions
DROP TRIGGER IF EXISTS reactions_update_user_stats ON public.reactions;
CREATE TRIGGER reactions_update_user_stats
    AFTER INSERT OR DELETE ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

-- Function to check username availability (updated to use user_profiles table)
CREATE OR REPLACE FUNCTION check_username_availability(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if username exists (case-insensitive)
    RETURN NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE LOWER(username) = LOWER(username_to_check)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user profile (called during onboarding)
CREATE OR REPLACE FUNCTION create_user_profile(
    user_uuid UUID,
    username_param TEXT,
    email_param TEXT,
    university_id_param BIGINT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        username, 
        email, 
        university_id
    ) VALUES (
        user_uuid,
        username_param,
        email_param,
        university_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;