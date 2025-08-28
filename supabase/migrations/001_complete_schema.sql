-- =============================================
-- Cheevo Complete Database Schema Migration
-- =============================================
-- This migration creates all tables, indexes, RLS policies, 
-- functions, and triggers needed for the Cheevo app

-- =============================================
-- 1. CREATE ENUMS
-- =============================================

DO $$ 
BEGIN
    -- Content type enum for reports and moderation
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
        CREATE TYPE content_type AS ENUM ('post', 'comment');
    END IF;
    
    -- Report status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');
    END IF;
    
    -- Ban type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ban_type') THEN
        CREATE TYPE ban_type AS ENUM ('shadow_ban', 'permanent_ban');
    END IF;
    
    -- Moderation action enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_action') THEN
        CREATE TYPE moderation_action AS ENUM ('approved', 'removed', 'manual_review');
    END IF;
END $$;

-- =============================================
-- 2. CREATE TABLES (In dependency order)
-- =============================================

-- Universities table
CREATE TABLE IF NOT EXISTS public.universities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- App configuration table
CREATE TABLE IF NOT EXISTS public.app_config (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Moderation configuration table
CREATE TABLE IF NOT EXISTS public.moderation_config (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL, -- harassment, hate, violence, etc.
    threshold DECIMAL(3,2) NOT NULL CHECK (threshold >= 0 AND threshold <= 1),
    auto_action moderation_action NOT NULL DEFAULT 'manual_review',
    applies_to TEXT NOT NULL DEFAULT 'both', -- posts, comments, both
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(category, applies_to)
);

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    giphy_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    university_id BIGINT REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
    reactions_count INTEGER DEFAULT 0 CHECK (reactions_count >= 0),
    comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
    views_count INTEGER DEFAULT 0 CHECK (views_count >= 0),
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_score JSONB,
    is_trending BOOLEAN DEFAULT FALSE,
    trending_score DECIMAL(10,6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Comments table (threaded)
CREATE TABLE IF NOT EXISTS public.comments (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    giphy_url TEXT,
    post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id BIGINT REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    thread_depth INTEGER DEFAULT 0 CHECK (thread_depth >= 0 AND thread_depth <= 3),
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_score JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Reactions table (posts only)
CREATE TABLE IF NOT EXISTS public.reactions (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Post views table (for trending algorithm)
CREATE TABLE IF NOT EXISTS public.post_views (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reported_content_type content_type NOT NULL,
    reported_content_id BIGINT NOT NULL,
    reason TEXT NOT NULL,
    status report_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User bans table
CREATE TABLE IF NOT EXISTS public.user_bans (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ban_type ban_type NOT NULL,
    violation_count INTEGER DEFAULT 1 CHECK (violation_count > 0),
    ban_duration_days INTEGER CHECK (ban_duration_days > 0),
    expires_at TIMESTAMP WITH TIME ZONE,
    reason TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User ban history table
CREATE TABLE IF NOT EXISTS public.user_ban_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL,
    ban_duration_days INTEGER NOT NULL,
    moderation_score JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Moderation logs table
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id BIGSERIAL PRIMARY KEY,
    content_type content_type NOT NULL,
    content_id BIGINT NOT NULL,
    content_text TEXT NOT NULL,
    openai_response JSONB NOT NULL,
    flagged BOOLEAN NOT NULL,
    action_taken moderation_action NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Universities indexes
CREATE INDEX IF NOT EXISTS universities_state_idx ON public.universities(state);
CREATE INDEX IF NOT EXISTS universities_name_idx ON public.universities(name);

-- Posts indexes
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_university_id_idx ON public.posts(university_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_trending_idx ON public.posts(is_trending, trending_score DESC) WHERE is_trending = TRUE;
CREATE INDEX IF NOT EXISTS posts_reactions_count_idx ON public.posts(reactions_count DESC);
CREATE INDEX IF NOT EXISTS posts_flagged_idx ON public.posts(is_flagged) WHERE is_flagged = TRUE;

-- Comments indexes
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at DESC);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS reactions_post_id_idx ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS reactions_user_id_idx ON public.reactions(user_id);
CREATE INDEX IF NOT EXISTS reactions_created_at_idx ON public.reactions(created_at DESC);

-- Post views indexes
CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS post_views_viewed_at_idx ON public.post_views(viewed_at DESC);

-- Reports indexes
CREATE INDEX IF NOT EXISTS reports_reporter_user_id_idx ON public.reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_content_type_id_idx ON public.reports(reported_content_type, reported_content_id);

-- User bans indexes
CREATE INDEX IF NOT EXISTS user_bans_user_id_idx ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS user_bans_active_idx ON public.user_bans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS user_bans_expires_at_idx ON public.user_bans(expires_at);

-- Moderation logs indexes
CREATE INDEX IF NOT EXISTS moderation_logs_content_type_id_idx ON public.moderation_logs(content_type, content_id);
CREATE INDEX IF NOT EXISTS moderation_logs_flagged_idx ON public.moderation_logs(flagged);
CREATE INDEX IF NOT EXISTS moderation_logs_processed_at_idx ON public.moderation_logs(processed_at DESC);

-- App config indexes
CREATE INDEX IF NOT EXISTS app_config_category_idx ON public.app_config(category);

-- =============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ban_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. CREATE RLS POLICIES
-- =============================================

-- Universities policies (public read access)
DROP POLICY IF EXISTS "Allow public read access to universities" ON public.universities;
CREATE POLICY "Allow public read access to universities" ON public.universities
    FOR SELECT USING (true);

-- App config policies (authenticated users can read)
DROP POLICY IF EXISTS "Allow authenticated users to read app config" ON public.app_config;
CREATE POLICY "Allow authenticated users to read app config" ON public.app_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Moderation config policies (service role only)
DROP POLICY IF EXISTS "Allow service role to manage moderation config" ON public.moderation_config;
CREATE POLICY "Allow service role to manage moderation config" ON public.moderation_config
    USING (auth.role() = 'service_role');

-- Posts policies
DROP POLICY IF EXISTS "Allow authenticated users to read posts" ON public.posts;
CREATE POLICY "Allow authenticated users to read posts" ON public.posts
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        NOT is_flagged AND
        -- Check if user is not shadow banned or if it's their own post
        (
            NOT EXISTS (
                SELECT 1 FROM public.user_bans ub 
                WHERE ub.user_id = posts.user_id 
                AND ub.is_active = TRUE 
                AND ub.ban_type = 'shadow_ban'
                AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
            )
            OR posts.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow authenticated users to create posts" ON public.posts;
CREATE POLICY "Allow authenticated users to create posts" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        auth.role() = 'authenticated' AND
        -- Check user is not banned
        NOT EXISTS (
            SELECT 1 FROM public.user_bans ub 
            WHERE ub.user_id = auth.uid() 
            AND ub.is_active = TRUE 
            AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
        )
    );

DROP POLICY IF EXISTS "Allow users to update own posts" ON public.posts;
CREATE POLICY "Allow users to update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete own posts" ON public.posts;
CREATE POLICY "Allow users to delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
DROP POLICY IF EXISTS "Allow authenticated users to read comments" ON public.comments;
CREATE POLICY "Allow authenticated users to read comments" ON public.comments
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        NOT is_flagged AND
        -- Same shadow ban logic as posts
        (
            NOT EXISTS (
                SELECT 1 FROM public.user_bans ub 
                WHERE ub.user_id = comments.user_id 
                AND ub.is_active = TRUE 
                AND ub.ban_type = 'shadow_ban'
                AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
            )
            OR comments.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow authenticated users to create comments" ON public.comments;
CREATE POLICY "Allow authenticated users to create comments" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        auth.role() = 'authenticated' AND
        -- Check user is not banned
        NOT EXISTS (
            SELECT 1 FROM public.user_bans ub 
            WHERE ub.user_id = auth.uid() 
            AND ub.is_active = TRUE 
            AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
        )
    );

DROP POLICY IF EXISTS "Allow users to update own comments" ON public.comments;
CREATE POLICY "Allow users to update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete own comments" ON public.comments;
CREATE POLICY "Allow users to delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Reactions policies
DROP POLICY IF EXISTS "Allow authenticated users to read reactions" ON public.reactions;
CREATE POLICY "Allow authenticated users to read reactions" ON public.reactions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to create reactions" ON public.reactions;
CREATE POLICY "Allow authenticated users to create reactions" ON public.reactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        auth.role() = 'authenticated' AND
        -- Check user is not banned
        NOT EXISTS (
            SELECT 1 FROM public.user_bans ub 
            WHERE ub.user_id = auth.uid() 
            AND ub.is_active = TRUE 
            AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
        )
    );

DROP POLICY IF EXISTS "Allow users to delete own reactions" ON public.reactions;
CREATE POLICY "Allow users to delete own reactions" ON public.reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Post views policies
DROP POLICY IF EXISTS "Allow authenticated users to create post views" ON public.post_views;
CREATE POLICY "Allow authenticated users to create post views" ON public.post_views
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Reports policies
DROP POLICY IF EXISTS "Allow authenticated users to create reports" ON public.reports;
CREATE POLICY "Allow authenticated users to create reports" ON public.reports
    FOR INSERT WITH CHECK (
        auth.uid() = reporter_user_id AND 
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Allow users to read own reports" ON public.reports;
CREATE POLICY "Allow users to read own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_user_id);

-- User bans policies (service role only)
DROP POLICY IF EXISTS "Allow service role to manage user bans" ON public.user_bans;
CREATE POLICY "Allow service role to manage user bans" ON public.user_bans
    USING (auth.role() = 'service_role');

-- User ban history policies (service role only)  
DROP POLICY IF EXISTS "Allow service role to manage user ban history" ON public.user_ban_history;
CREATE POLICY "Allow service role to manage user ban history" ON public.user_ban_history
    USING (auth.role() = 'service_role');

-- Moderation logs policies (service role only)
DROP POLICY IF EXISTS "Allow service role to manage moderation logs" ON public.moderation_logs;
CREATE POLICY "Allow service role to manage moderation logs" ON public.moderation_logs
    USING (auth.role() = 'service_role');

-- =============================================
-- 6. CREATE FUNCTIONS
-- =============================================

-- Function to update post reaction counts
DROP FUNCTION IF EXISTS update_post_reactions_count() CASCADE;
CREATE OR REPLACE FUNCTION update_post_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts 
        SET reactions_count = reactions_count + 1,
            updated_at = NOW()
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts 
        SET reactions_count = GREATEST(reactions_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post comment counts
DROP FUNCTION IF EXISTS update_post_comments_count() CASCADE;
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts 
        SET comments_count = comments_count + 1,
            updated_at = NOW()
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts 
        SET comments_count = GREATEST(comments_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post view counts
DROP FUNCTION IF EXISTS update_post_views_count() CASCADE;
CREATE OR REPLACE FUNCTION update_post_views_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.posts 
    SET views_count = views_count + 1,
        updated_at = NOW()
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and enforce comment thread depth
DROP FUNCTION IF EXISTS enforce_comment_thread_depth() CASCADE;
CREATE OR REPLACE FUNCTION enforce_comment_thread_depth()
RETURNS TRIGGER AS $$
DECLARE
    parent_depth INTEGER := 0;
    max_depth INTEGER := 3;
BEGIN
    -- Get max depth from config if available
    SELECT COALESCE((value->>'comment_thread_depth')::INTEGER, 3) INTO max_depth
    FROM public.app_config WHERE key = 'comment_thread_depth';
    
    -- If this is a reply to another comment, get parent depth
    IF NEW.parent_comment_id IS NOT NULL THEN
        SELECT thread_depth INTO parent_depth
        FROM public.comments 
        WHERE id = NEW.parent_comment_id;
        
        NEW.thread_depth := parent_depth + 1;
        
        -- Enforce max depth
        IF NEW.thread_depth > max_depth THEN
            RAISE EXCEPTION 'Comment thread depth cannot exceed %', max_depth;
        END IF;
    ELSE
        NEW.thread_depth := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically expire user bans
DROP FUNCTION IF EXISTS expire_user_bans() CASCADE;
CREATE OR REPLACE FUNCTION expire_user_bans()
RETURNS void AS $$
BEGIN
    UPDATE public.user_bans 
    SET is_active = FALSE
    WHERE is_active = TRUE 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. CREATE TRIGGERS
-- =============================================

-- Trigger to update reaction counts
DROP TRIGGER IF EXISTS trigger_update_post_reactions_count_insert ON public.reactions;
CREATE TRIGGER trigger_update_post_reactions_count_insert
    AFTER INSERT ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_reactions_count();

DROP TRIGGER IF EXISTS trigger_update_post_reactions_count_delete ON public.reactions;
CREATE TRIGGER trigger_update_post_reactions_count_delete
    AFTER DELETE ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_reactions_count();

-- Trigger to update comment counts
DROP TRIGGER IF EXISTS trigger_update_post_comments_count_insert ON public.comments;
CREATE TRIGGER trigger_update_post_comments_count_insert
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

DROP TRIGGER IF EXISTS trigger_update_post_comments_count_delete ON public.comments;
CREATE TRIGGER trigger_update_post_comments_count_delete
    AFTER DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Trigger to update view counts
DROP TRIGGER IF EXISTS trigger_update_post_views_count ON public.post_views;
CREATE TRIGGER trigger_update_post_views_count
    AFTER INSERT ON public.post_views
    FOR EACH ROW EXECUTE FUNCTION update_post_views_count();

-- Trigger to enforce comment thread depth
DROP TRIGGER IF EXISTS trigger_enforce_comment_thread_depth ON public.comments;
CREATE TRIGGER trigger_enforce_comment_thread_depth
    BEFORE INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION enforce_comment_thread_depth();

-- =============================================
-- 8. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant usage on sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on tables to authenticated role
GRANT SELECT ON public.universities TO authenticated;
GRANT SELECT ON public.app_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT INSERT ON public.post_views TO authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;

-- Grant full permissions to service_role for admin operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Tables created: 11
-- Indexes created: 20+  
-- RLS policies created: 15+
-- Functions created: 5
-- Triggers created: 6