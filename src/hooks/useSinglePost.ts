import { useState, useEffect } from 'react';
import { postService } from '@/src/services/post.service';
import { FeedPost } from '@/src/services/feed.service';

export interface UseSinglePostResult {
  post: FeedPost | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSinglePost(postId: number): UseSinglePostResult {
  const [post, setPost] = useState<FeedPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await postService.getPost(postId);

      if (result.success) {
        setPost(result.data.post);
      } else {
        setError(result.error || 'Failed to load post');
        setPost(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setPost(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    await fetchPost();
  };

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  return {
    post,
    isLoading,
    error,
    refresh
  };
}