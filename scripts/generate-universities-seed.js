const fs = require('fs');
const path = require('path');

// Read the states.json file
const statesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../states.json'), 'utf8'));

// Generate SQL INSERT statements
const universities = [];

statesData.forEach(stateObj => {
  const stateName = Object.keys(stateObj)[0];
  const stateUniversities = stateObj[stateName];
  
  Object.values(stateUniversities).forEach(universityName => {
    if (universityName && universityName.trim() !== '') {
      // Clean up university names - remove any numbering or extra content
      const cleanName = universityName
        .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
        .replace(/\s+\([^)]*\)$/, '') // Remove trailing parentheses content like "(State owned)"
        .trim();
      
      if (cleanName && cleanName !== '') {
        universities.push({
          name: cleanName,
          state: stateName
        });
      }
    }
  });
});

// Remove duplicates
const uniqueUniversities = universities.filter((university, index, self) => 
  index === self.findIndex(u => u.name === university.name && u.state === university.state)
);

// Generate SQL INSERT statements with proper escaping
const sqlInserts = uniqueUniversities.map(uni => 
  `('${uni.name.replace(/'/g, "''")}', '${uni.state.replace(/'/g, "''")}')`
).join(',\n    ');

// Generate comprehensive seed SQL
const seedSql = `-- =============================================
-- Cheevo Database Seed Data
-- =============================================
-- Run this after running the main migration

-- =============================================
-- 1. SEED UNIVERSITIES
-- =============================================

-- Insert universities (with conflict resolution)
INSERT INTO public.universities (name, state) VALUES
    ${sqlInserts}
ON CONFLICT DO NOTHING;

-- =============================================
-- 2. SEED APP CONFIGURATION
-- =============================================

INSERT INTO public.app_config (key, value, category, description) VALUES
    -- Content & Engagement
    ('max_post_length', '280', 'content', 'Maximum characters allowed in a post'),
    ('max_comment_length', '140', 'content', 'Maximum characters allowed in a comment'),
    ('max_comments_per_post', '100', 'content', 'Maximum comments allowed per post'),
    ('max_replies_per_comment', '10', 'content', 'Maximum replies per comment'),
    ('comment_thread_depth', '3', 'content', 'Maximum depth of comment threads'),
    ('enable_reactions', 'true', 'content', 'Enable fire reactions on posts'),
    ('enable_comments', 'true', 'content', 'Enable comments on posts'),
    ('enable_gifs', 'true', 'content', 'Enable Giphy GIF integration'),
    
    -- Rate Limiting
    ('posts_per_hour', '10', 'rate_limiting', 'Maximum posts per user per hour'),
    ('posts_per_day', '50', 'rate_limiting', 'Maximum posts per user per day'),
    ('comments_per_hour', '30', 'rate_limiting', 'Maximum comments per user per hour'),
    ('comments_per_day', '100', 'rate_limiting', 'Maximum comments per user per day'),
    ('reactions_per_hour', '100', 'rate_limiting', 'Maximum reactions per user per hour'),
    ('reports_per_day', '10', 'rate_limiting', 'Maximum reports per user per day'),
    
    -- Trending Algorithm
    ('trending_window_hours', '24', 'trending', 'Time window for trending calculations'),
    ('trending_refresh_minutes', '15', 'trending', 'How often to refresh trending posts'),
    ('trending_min_reactions', '5', 'trending', 'Minimum reactions needed to be trending'),
    ('trending_boost_factor', '1.5', 'trending', 'Boost factor for trending score'),
    ('trending_decay_rate', '0.8', 'trending', 'Time decay rate for trending algorithm'),
    
    -- Feed Settings
    ('campus_feed_limit', '50', 'feeds', 'Number of posts to load in campus feed'),
    ('national_feed_limit', '100', 'feeds', 'Number of posts to load in national feed'),
    ('enable_national_feed', 'true', 'feeds', 'Enable Nigeria-wide trending feed'),
    ('show_reaction_counts', 'true', 'feeds', 'Show reaction counts on posts'),
    ('show_comment_counts', 'true', 'feeds', 'Show comment counts on posts'),
    
    -- Shadow Ban System
    ('first_ban_days', '7', 'moderation', 'Duration of first shadow ban in days'),
    ('second_ban_days', '14', 'moderation', 'Duration of second shadow ban in days'),
    ('third_ban_days', '28', 'moderation', 'Duration of third shadow ban in days'),
    ('fourth_ban_days', '56', 'moderation', 'Duration of fourth shadow ban in days'),
    ('max_ban_days', '180', 'moderation', 'Maximum ban duration before permanent (6 months)'),
    ('ban_escalation_reset_days', '90', 'moderation', 'Days after which violation count resets'),
    
    -- Feature Flags
    ('maintenance_mode', 'false', 'features', 'Enable maintenance mode'),
    ('new_user_registrations', 'true', 'features', 'Allow new user registrations'),
    ('giphy_integration', 'true', 'features', 'Enable Giphy API integration'),
    ('enable_reporting', 'true', 'features', 'Enable user reporting system'),
    ('enable_trending', 'true', 'features', 'Enable trending algorithm'),
    ('show_university_in_posts', 'true', 'features', 'Show university name in posts'),
    
    -- User Experience
    ('onboarding_required', 'true', 'user_experience', 'Require onboarding flow for new users'),
    ('username_min_length', '3', 'user_experience', 'Minimum username length'),
    ('username_max_length', '20', 'user_experience', 'Maximum username length'),
    ('force_app_update_version', 'null', 'user_experience', 'Force app update to this version')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- =============================================
-- 3. SEED MODERATION CONFIGURATION
-- =============================================

INSERT INTO public.moderation_config (category, threshold, auto_action, applies_to) VALUES
    ('harassment', 0.70, 'manual_review', 'both'),
    ('harassment/threatening', 0.60, 'removed', 'both'),
    ('hate', 0.80, 'removed', 'both'),
    ('hate/threatening', 0.60, 'removed', 'both'),
    ('violence', 0.60, 'manual_review', 'both'),
    ('violence/graphic', 0.50, 'removed', 'both'),
    ('sexual', 0.80, 'removed', 'both'),
    ('sexual/minors', 0.30, 'removed', 'both'),
    ('self-harm', 0.50, 'manual_review', 'both'),
    ('self-harm/intent', 0.40, 'removed', 'both'),
    ('self-harm/instructions', 0.30, 'removed', 'both'),
    ('illicit', 0.70, 'manual_review', 'both'),
    ('illicit/violent', 0.50, 'removed', 'both')
ON CONFLICT (category, applies_to) DO UPDATE SET
    threshold = EXCLUDED.threshold,
    auto_action = EXCLUDED.auto_action,
    updated_at = NOW();

-- =============================================
-- SEED DATA COMPLETE
-- =============================================`;

// Write to seed file
fs.writeFileSync(path.join(__dirname, '../supabase/seed.sql'), seedSql);

console.log(`✅ Generated comprehensive seed data:`);
console.log(`   • ${uniqueUniversities.length} universities`);
console.log(`   • ${40} app configuration settings`);
console.log(`   • ${13} moderation configuration settings`);
console.log(`📄 Seed file created at: supabase/seed.sql`);