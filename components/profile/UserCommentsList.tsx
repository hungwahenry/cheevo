import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useProfileContent } from '@/src/hooks/useProfileContent';
import { StyleSheet } from 'react-native';

interface UserCommentsListProps {
  userId: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  originalPost?: {
    id: string;
    content: string;
  };
}

export function UserCommentsList({ userId }: UserCommentsListProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  
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
                Commented on:
              </Text>
              <Text 
                style={[styles.originalContent, { color: mutedColor }]}
                numberOfLines={2}
              >
                {comment.originalPost.content}
              </Text>
            </View>
          )}
          
          <View style={styles.commentContent}>
            <Text style={styles.emojiIcon}>💬</Text>
            <Text style={styles.commentText}>{comment.content}</Text>
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
});