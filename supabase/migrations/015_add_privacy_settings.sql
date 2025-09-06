-- =============================================
-- Privacy Settings Migration
-- =============================================
-- Adds privacy settings to user_profiles and creates blocked_users table

-- 1. Add privacy settings columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'university' 
CHECK (profile_visibility IN ('everyone', 'university', 'nobody'));

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS who_can_react TEXT DEFAULT 'everyone' 
CHECK (who_can_react IN ('everyone', 'university'));

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS who_can_comment TEXT DEFAULT 'everyone' 
CHECK (who_can_comment IN ('everyone', 'university'));

-- 2. Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id BIGSERIAL PRIMARY KEY,
    blocker_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    blocked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure a user can't block the same user twice
    UNIQUE(blocker_user_id, blocked_user_id),
    
    -- Ensure a user can't block themselves
    CHECK (blocker_user_id != blocked_user_id)
);

-- 3. Enable RLS on blocked_users table
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for blocked_users
DROP POLICY IF EXISTS "Users can view their own blocked users" ON public.blocked_users;
CREATE POLICY "Users can view their own blocked users" ON public.blocked_users
    FOR SELECT USING (auth.uid() = blocker_user_id);

DROP POLICY IF EXISTS "Users can create their own blocks" ON public.blocked_users;
CREATE POLICY "Users can create their own blocks" ON public.blocked_users
    FOR INSERT WITH CHECK (auth.uid() = blocker_user_id);

DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocked_users;
CREATE POLICY "Users can delete their own blocks" ON public.blocked_users
    FOR DELETE USING (auth.uid() = blocker_user_id);

-- Service role can manage all blocks
DROP POLICY IF EXISTS "Service role can manage blocked users" ON public.blocked_users;
CREATE POLICY "Service role can manage blocked users" ON public.blocked_users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS blocked_users_blocker_user_id_idx ON public.blocked_users(blocker_user_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_user_id_idx ON public.blocked_users(blocked_user_id);
CREATE INDEX IF NOT EXISTS blocked_users_created_at_idx ON public.blocked_users(created_at DESC);

-- 6. Create function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE blocker_user_id = blocker_id 
        AND blocked_user_id = blocked_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check mutual blocks
CREATE OR REPLACE FUNCTION are_users_mutually_blocked(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.blocked_users 
        WHERE (blocker_user_id = user1_id AND blocked_user_id = user2_id)
        OR (blocker_user_id = user2_id AND blocked_user_id = user1_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update updated_at trigger for blocked_users
CREATE OR REPLACE FUNCTION update_blocked_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_blocked_users_updated_at ON public.blocked_users;
CREATE TRIGGER update_blocked_users_updated_at
    BEFORE UPDATE ON public.blocked_users
    FOR EACH ROW EXECUTE FUNCTION update_blocked_users_updated_at();

-- 9. Grant permissions
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
GRANT USAGE ON SEQUENCE public.blocked_users_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.blocked_users_id_seq TO service_role;