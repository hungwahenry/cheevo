import { supabase } from '@/lib/supabase';
import { Tables } from '@/src/types/database.generated';

export type FeedAlgorithm = 
  | 'chronological'    // Recent posts first
  | 'trending'         // Hot/trending posts  
  | 'engagement'       // High engagement posts
  | 'balanced'         // Mix of trending + recent
  | 'discovery';       // Diverse content discovery

export type FeedScope = 'campus' | 'global';

export interface FeedPost extends Tables<'posts'> {
  user_profiles: {
    username: string;
    avatar_url: string | null;
    trending_score: number | null;
    university_id: number;
  } | null;
  universities: {
    name: string;
    short_name: string | null;
    state: string;
  } | null;
  reactions: Array<{
    id: number;
    user_id: string;
    created_at: string;
  }>;
  user_reaction?: {
    id: number;
    user_id: string;
    created_at: string;
  } | null;
}

export interface FeedOptions {
  algorithm: FeedAlgorithm;
  scope: FeedScope;
  limit?: number;
  offset?: number;
}

export interface FeedResponse {
  posts: FeedPost[];
  hasMore: boolean;
  nextOffset: number;
  algorithm: FeedAlgorithm;
  totalCount?: number;
  config: {
    showReactionCounts: boolean;
    showCommentCounts: boolean;
  };
}

class FeedService {
  
  /**
   * Main feed fetching method - calls edge function
   */
  async getFeed(options: FeedOptions): Promise<FeedResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('get-feed', {
        body: {
          algorithm: options.algorithm,
          scope: options.scope,
          limit: options.limit || 20,
          offset: options.offset || 0
        }
      });

      if (error) {
        console.error('Feed edge function error:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Feed service error:', error);
      // Return empty feed on error
      return {
        posts: [],
        hasMore: false,
        nextOffset: options.offset || 0,
        algorithm: options.algorithm,
        config: {
          showReactionCounts: true,
          showCommentCounts: true,
        }
      };
    }
  }


  /**
   * Track post view - all deduplication logic handled at database level
   */
  async trackPostView(
    postId: number, 
    context?: { 
      source?: string; 
      algorithm?: string; 
      scope?: string; 
    }
  ): Promise<{ success: boolean; tracked: boolean }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User must be authenticated to track views');
      }

      const { data, error } = await supabase.functions.invoke('track-post-view', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: { postId, context }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.warn('View tracking failed:', error);
      // Return failure result instead of throwing - view tracking shouldn't break UI
      return { success: false, tracked: false };
    }
  }

  /**
   * Get post engagement data for analytics
   */
  async getPostEngagement(postId: number) {
    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select(`
          id,
          reactions_count,
          comments_count,
          views_count,
          trending_score,
          is_trending,
          created_at
        `)
        .eq('id', postId)
        .single();

      if (error || !post) {
        throw error;
      }

      // Calculate engagement rate
      const views = post.views_count || 0;
      const reactions = post.reactions_count || 0;
      const comments = post.comments_count || 0;
      
      const engagementRate = views > 0 
        ? ((reactions + comments) / views) * 100
        : 0;

      return {
        ...post,
        engagement_rate: Math.round(engagementRate * 100) / 100
      };

    } catch (error) {
      console.error('Error getting post engagement:', error);
      throw error;
    }
  }

}

export const feedService = new FeedService();