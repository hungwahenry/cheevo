-- Create universities table
CREATE TABLE IF NOT EXISTS public.universities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS universities_state_idx ON public.universities(state);
CREATE INDEX IF NOT EXISTS universities_name_idx ON public.universities(name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read universities
CREATE POLICY "Allow authenticated users to read universities" ON public.universities
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow all users (including anonymous) to read universities
CREATE POLICY "Allow public read access to universities" ON public.universities
    FOR SELECT USING (true);

-- Create posts table for user posts
CREATE TABLE IF NOT EXISTS public.posts (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    university_id BIGINT REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
    reactions_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance on posts
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_university_id_idx ON public.posts(university_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

-- Enable Row Level Security (RLS) for posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read posts
CREATE POLICY "Allow authenticated users to read posts" ON public.posts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert posts
CREATE POLICY "Allow authenticated users to create posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Create policy to allow users to update their own posts
CREATE POLICY "Allow users to update own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own posts
CREATE POLICY "Allow users to delete own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Create reactions table for post reactions
CREATE TABLE IF NOT EXISTS public.reactions (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure one reaction per user per post
    UNIQUE(post_id, user_id)
);

-- Create indexes for better query performance on reactions
CREATE INDEX IF NOT EXISTS reactions_post_id_idx ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS reactions_user_id_idx ON public.reactions(user_id);

-- Enable Row Level Security (RLS) for reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read reactions
CREATE POLICY "Allow authenticated users to read reactions" ON public.reactions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to create reactions
CREATE POLICY "Allow authenticated users to create reactions" ON public.reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Create policy to allow users to delete their own reactions
CREATE POLICY "Allow users to delete own reactions" ON public.reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update reaction counts
CREATE OR REPLACE FUNCTION update_post_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts 
        SET reactions_count = reactions_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts 
        SET reactions_count = reactions_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update reaction counts
DROP TRIGGER IF EXISTS trigger_update_post_reactions_count_insert ON public.reactions;
CREATE TRIGGER trigger_update_post_reactions_count_insert
    AFTER INSERT ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_reactions_count();

DROP TRIGGER IF EXISTS trigger_update_post_reactions_count_delete ON public.reactions;
CREATE TRIGGER trigger_update_post_reactions_count_delete
    AFTER DELETE ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_reactions_count();