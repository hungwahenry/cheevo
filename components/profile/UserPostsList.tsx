import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { userProfileService } from '@/src/services/user-profile.service';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

interface Post {
  id: string;
  content: string;
  giphy_url: string | null;
  reactions_count: number;
  comments_count: number;
  views_count: number;
  trending_score: number;
  is_trending: boolean;
  created_at: string;
  universities?: {
    name: string;
    short_name: string | null;
  };
}

interface UserPostsListProps {
  userId: string;
}

export function UserPostsList({ userId }: UserPostsListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'background');

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await userProfileService.getUserPosts(userId, 20, 0);
      
      if (response.success) {
        setPosts(response.data);
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const PostItem = ({ item }: { item: Post }) => (
    <Card style={styles.postCard}>
      <Text style={styles.postContent}>{item.content}</Text>
      
      {item.giphy_url && (
        <Image
          source={{ uri: item.giphy_url }}
          style={styles.gifImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.postMeta}>
        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Text style={styles.emojiIcon}>🔥</Text>
            <Text style={[styles.statText, { color: mutedColor }]}>
              {item.reactions_count}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.emojiIcon}>💬</Text>
            <Text style={[styles.statText, { color: mutedColor }]}>
              {item.comments_count}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.emojiIcon}>👀</Text>
            <Text style={[styles.statText, { color: mutedColor }]}>
              {item.views_count}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.dateText, { color: mutedColor }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>
    </Card>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: mutedColor }]}>
        No posts yet
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.loadingText, { color: mutedColor }]}>
          Loading posts...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.errorText, { color: mutedColor }]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.list, { backgroundColor }]}>
      <View style={styles.listContent}>
        {posts.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          posts.map((item) => (
            <PostItem key={item.id} item={item} />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  postCard: {
    padding: 16,
    gap: 12,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  gifImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emojiIcon: {
    fontSize: 14,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});