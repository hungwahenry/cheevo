import React, { useEffect, useState } from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useThemeColor } from '@/hooks/useThemeColor';
import { userProfileService } from '@/src/services/user-profile.service';
import { StyleSheet } from 'react-native';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  giphy_url: null;
  reactions_count: number;
  comments_count: number;
  views_count: number;
  trending_score: number;
  is_trending: boolean;
  user_id: string;
  username: string;
  originalPost?: {
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
  };
}

interface UserCommentsListProps {
  userId: string;
}

export function UserCommentsList({ userId }: UserCommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  const fetchComments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await userProfileService.getUserComments(userId, 20, 0);
      
      if (response.success) {
        setComments(response.data);
        setError(null);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComments();
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

  const CommentItem = ({ item }: { item: Comment }) => (
    <Card style={styles.commentCard}>
      {/* Original Post Context */}
      {item.originalPost && (
        <View style={[styles.originalPost, { borderLeftColor: borderColor }]}>
          <Text style={[styles.originalLabel, { color: mutedColor }]}>
            Commented on:
          </Text>
          <Text 
            style={[styles.originalContent, { color: mutedColor }]}
            numberOfLines={2}
          >
            {item.originalPost.content}
          </Text>
        </View>
      )}
      
      {/* Comment Content */}
      <View style={styles.commentContent}>
        <Text style={styles.emojiIcon}>💬</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
      
      <Text style={[styles.dateText, { color: mutedColor }]}>
        {formatDate(item.created_at)}
      </Text>
    </Card>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: mutedColor }]}>
        No comments yet
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.loadingText, { color: mutedColor }]}>
          Loading comments...
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
        {comments.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          comments.map((item) => (
            <CommentItem key={item.id} item={item} />
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
  commentCard: {
    padding: 16,
    gap: 12,
  },
  originalPost: {
    paddingLeft: 12,
    borderLeftWidth: 3,
    gap: 4,
  },
  originalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  originalContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  commentContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  emojiIcon: {
    fontSize: 16,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    alignSelf: 'flex-end',
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