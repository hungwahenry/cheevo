import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { PostItem } from '@/components/feed/PostItem';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useProfileContent } from '@/src/hooks/useProfileContent';
import { FeedPost } from '@/src/services/feed.service';
import { StyleSheet } from 'react-native';

interface UserLikesListProps {
  userId: string;
}

export function UserLikesList({ userId }: UserLikesListProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'background');
  
  const { data, isLoading, error, toggleReaction, trackView } = useProfileContent(userId, 'likes');
  const likes = data as FeedPost[];

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <Text style={[styles.loadingText, { color: mutedColor }]}>
          Loading liked posts...
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

  if (likes.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor }]}>
        <Text style={[styles.emptyText, { color: mutedColor }]}>
          No likes yet
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {likes.map((post) => (
        <PostItem 
          key={post.id} 
          post={post}
          showUniversity={true}
          onReaction={toggleReaction}
          onView={() => trackView(post.id)}
        />
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
});