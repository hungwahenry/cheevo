import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Image } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useThemeColor } from '@/hooks/useThemeColor';
import { userProfileService } from '@/src/services/user-profile.service';
import { StyleSheet } from 'react-native';

interface LikedPost {
  id: string;
  content: string;
  giphy_url: string | null;
  reactions_count: number;
  comments_count: number;
  views_count: number;
  trending_score: number;
  is_trending: boolean;
  created_at: string;
  user_id: string;
}

interface UserLikesListProps {
  userId: string;
}

export function UserLikesList({ userId }: UserLikesListProps) {
  const [likes, setLikes] = useState<LikedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const backgroundColor = useThemeColor({}, 'background');

  const fetchLikes = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await userProfileService.getUserLikes(userId, 20, 0);
      
      if (response.success) {
        setLikes(response.data);
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load likes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLikes();
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

  const LikedPostItem = ({ item }: { item: LikedPost }) => (
    <Card style={styles.postCard}>
      <View style={styles.likedIndicator}>
        <Text style={[styles.emojiIcon, { color: primaryColor }]}>🔥</Text>
        <Text style={[styles.likedText, { color: primaryColor }]}>
          You liked this post
        </Text>
      </View>
      
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
        No likes yet
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.loadingText, { color: mutedColor }]}>
          Loading liked posts...
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
    <FlatList
      data={likes}
      renderItem={LikedPostItem}
      keyExtractor={(item) => item.id}
      style={[styles.list, { backgroundColor }]}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={EmptyState}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchLikes(true)}
        />
      }
      showsVerticalScrollIndicator={false}
    />
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
  likedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  emojiIcon: {
    fontSize: 14,
  },
  likedText: {
    fontSize: 12,
    fontWeight: '600',
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