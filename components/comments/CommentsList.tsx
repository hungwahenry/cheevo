import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Comment } from '@/src/services/comment.service';
import { MessageCircle } from 'lucide-react-native';
import { CommentItem } from './CommentItem';

interface CommentsListProps {
  mainComments: Comment[]; // Top-level comments only
  getRepliesForComment: (commentId: number) => Comment[];
  getReplyCount: (commentId: number) => number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onRefresh: () => void;
  onReplyPress: (commentId: number, username: string) => void;
  onLoadMore: () => void;
  deleteComment: (commentId: number) => Promise<{ success: boolean; message?: string }>;
  onReport?: (commentId: number) => void;
}

export function CommentsList({ 
  mainComments,
  getRepliesForComment,
  getReplyCount,
  isLoading, 
  isLoadingMore,
  hasMore,
  onRefresh, 
  onReplyPress,
  onLoadMore,
  deleteComment,
  onReport
}: CommentsListProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');

  if (isLoading && mainComments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Spinner size="lg" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>
          Loading comments...
        </Text>
      </View>
    );
  }

  if (mainComments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MessageCircle size={40} color={mutedColor} />
        <Text style={styles.emptyTitle}>No comments yet</Text>
        <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
          Be the first to share your thoughts!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mainComments.map((comment, index) => (
        <View key={comment.id}>
          <CommentItem 
            comment={comment}
            replies={getRepliesForComment(comment.id)}
            replyCount={getReplyCount(comment.id)}
            onReplyPress={onReplyPress}
            deleteComment={deleteComment}
            onReport={onReport}
          />
          
          {/* Separator between main comments */}
          {index < mainComments.length - 1 && <View style={styles.separator} />}
        </View>
      ))}

      {/* Load More Comments */}
      {hasMore && (
        <View style={styles.loadMoreContainer}>
          <Button 
            variant="outline" 
            onPress={onLoadMore}
            disabled={isLoadingMore}
            style={styles.loadMoreButton}
          >
            {isLoadingMore ? (
              <>
                <Spinner size="sm" />
                <Text style={styles.loadMoreText}>Loading...</Text>
              </>
            ) : (
              <Text style={styles.loadMoreText}>Load More Comments</Text>
            )}
          </Button>
        </View>
      )}

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <View style={styles.loadingFooter}>
          <Text style={[styles.loadingText, { color: mutedColor }]}>
            Loading more comments...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  centerContainer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 8,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreButton: {
    paddingHorizontal: 20,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingFooter: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
  },
});