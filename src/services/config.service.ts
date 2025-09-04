import { supabase } from '@/lib/supabase';

class ConfigService {
  private appConfigs: Map<string, any> = new Map();
  private lastLoaded: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private parseConfigValue(value: any): any {
    if (typeof value !== 'string') return value;

    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, try to parse as number or boolean
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (!isNaN(Number(value))) return Number(value);
      return value; // Return as string if nothing else works
    }
  }

  private async loadConfigs(): Promise<void> {
    try {
      // Load app configs
      const { data: appConfigs, error: appError } = await supabase
        .from('app_config')
        .select('*');

      if (appError) {
        console.error('Error loading app config:', appError);
      } else {
        this.appConfigs.clear();
        appConfigs?.forEach(config => {
          this.appConfigs.set(config.key, this.parseConfigValue(config.value));
        });
      }

      this.lastLoaded = new Date();
    } catch (error) {
      console.error('Error loading configurations:', error);
    }
  }

  private async ensureConfigsLoaded(): Promise<void> {
    const now = new Date();
    const shouldReload = !this.lastLoaded || 
      (now.getTime() - this.lastLoaded.getTime()) > this.CACHE_DURATION;

    if (shouldReload) {
      await this.loadConfigs();
    }
  }

  async getAppConfig<T = any>(key: string, defaultValue: T): Promise<T> {
    await this.ensureConfigsLoaded();
    return this.appConfigs.get(key) ?? defaultValue;
  }

  // Convenience methods for commonly used configs
  async getContentLimits() {
    return {
      maxPostLength: await this.getAppConfig('max_post_length', 280),
      maxCommentLength: await this.getAppConfig('max_comment_length', 140),
      maxCommentsPerPost: await this.getAppConfig('max_comments_per_post', 100),
    };
  }

  async getFeatureFlags() {
    return {
      enableReactions: await this.getAppConfig('enable_reactions', true),
      enableComments: await this.getAppConfig('enable_comments', true),
      enableGifs: await this.getAppConfig('enable_gifs', true),
      enableReporting: await this.getAppConfig('enable_reporting', true),
      enableTrending: await this.getAppConfig('enable_trending', true),
      maintenanceMode: await this.getAppConfig('maintenance_mode', false),
      newUserRegistrations: await this.getAppConfig('new_user_registrations', true),
    };
  }

  async getRateLimits() {
    return {
      postsPerHour: await this.getAppConfig('posts_per_hour', 10),
      postsPerDay: await this.getAppConfig('posts_per_day', 50),
      commentsPerHour: await this.getAppConfig('comments_per_hour', 30),
      commentsPerDay: await this.getAppConfig('comments_per_day', 100),
      reactionsPerHour: await this.getAppConfig('reactions_per_hour', 100),
      reportsPerDay: await this.getAppConfig('reports_per_day', 10),
    };
  }

  async getTrendingSettings() {
    return {
      trendingWindowHours: await this.getAppConfig('trending_window_hours', 24),
      trendingRefreshMinutes: await this.getAppConfig('trending_refresh_minutes', 15),
      trendingMinReactions: await this.getAppConfig('trending_min_reactions', 5),
      trendingBoostFactor: await this.getAppConfig('trending_boost_factor', 1.5),
      trendingDecayRate: await this.getAppConfig('trending_decay_rate', 0.8),
    };
  }

  async getFeedSettings() {
    return {
      campusFeedLimit: await this.getAppConfig('campus_feed_limit', 50),
      nationalFeedLimit: await this.getAppConfig('national_feed_limit', 100),
      enableNationalFeed: await this.getAppConfig('enable_national_feed', true),
      showReactionCounts: await this.getAppConfig('show_reaction_counts', true),
      showCommentCounts: await this.getAppConfig('show_comment_counts', true),
    };
  }

  async getUserExperienceSettings() {
    return {
      onboardingRequired: await this.getAppConfig('onboarding_required', true),
      showUniversityInPosts: await this.getAppConfig('show_university_in_posts', true),
    };
  }

  // Force reload configs (useful for admin interfaces)
  async reloadConfigs(): Promise<void> {
    this.lastLoaded = null;
    await this.loadConfigs();
  }

  // Get raw config for debugging
  async getAllAppConfigs(): Promise<Map<string, any>> {
    await this.ensureConfigsLoaded();
    return new Map(this.appConfigs);
  }
}

export const configService = new ConfigService();