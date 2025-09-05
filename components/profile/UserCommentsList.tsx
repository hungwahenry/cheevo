
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useProfileContent } from '@/src/hooks/useProfileContent';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface UserCommentsListProps {
  userId: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  giphy_url?: string | null;
  originalPost?: {
    id: string;
    content: string;
    giphy_url?: string | null;
    reactions_count: number;
    comments_count: number;
    views_count: number;
    created_at: string;
    user_id: string;
    user_profiles?: {
      username: string;
    };
  };
}

export function UserCommentsList({ userId }: UserCommentsListProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'foreground');
  
  const { data, isLoading, error } = useProfileContent(userId, 'comments');
  const comments = data as Comment[];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <Text style={[styles.loadingText, { color: mutedColor }]}>
          Loading comments...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: mutedColor }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <Text style={[styles.emptyText, { color: mutedColor }]}>
          No comments yet
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {comments.map((comment) => (
        <Card key={comment.id} style={styles.commentCard}>
          {comment.originalPost && (
            <View style={[styles.originalPost, { borderLeftColor: borderColor }]}>
              <Text style={[styles.originalLabel, { color: mutedColor }]}>
                @{comment.originalPost.user_profiles?.username || 'unknown'}
              </Text>
              
              {/* Original Post Content */}
              {comment.originalPost.content && (
                <Text 
                  style={[styles.originalContent, { color: mutedColor }]}
                  numberOfLines={3}
                >
                  {comment.originalPost.content}
                </Text>
              )}
              
              {/* Original Post GIF */}
              {comment.originalPost.giphy_url && (
                <Image
                  source={{ uri: comment.originalPost.giphy_url }}
                  style={styles.originalPostGif}
                  contentFit="cover"
                />
              )}
              
              {/* Post Stats */}
              <View style={styles.postStats}>
                <Text style={[styles.statText, { color: mutedColor }]}>
                  {comment.originalPost.reactions_count || 0} likes • {comment.originalPost.comments_count || 0} comments
                </Text>
              </View>
            </View>
          )}
          
          {/* User's Comment */}
          <View style={styles.userComment}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentLabel, { color: mutedColor }]}>
                Your comment:
              </Text>
            </View>
            
            <Text style={[styles.commentText, { color: textColor }]}>
              {comment.content}
            </Text>
            
            {/* Comment GIF if exists */}
            {comment.giphy_url && (
              <Image
                source={{ uri: comment.giphy_url }}
                style={styles.commentGif}
                contentFit="cover"
              />
            )}
          </View>
          
          <Text style={[styles.dateText, { color: mutedColor }]}>
            {formatDate(comment.created_at)}
          </Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
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
  emptyText: {
    fontSize: 14,
  },
  commentCard: {
    padding: 16,
    gap: 12,
  },
  originalPost: {
    paddingLeft: 12,
    borderLeftWidth: 3,
    gap: 8,
    marginBottom: 8,
  },
  originalLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  originalContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  originalPostGif: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 4,
  },
  postStats: {
    marginTop: 6,
  },
  statText: {
    fontSize: 11,
  },
  userComment: {
    gap: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  commentGif: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginTop: 6,
  },
  dateText: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
});