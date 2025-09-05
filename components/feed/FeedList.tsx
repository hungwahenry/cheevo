import React from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFeed } from '@/src/hooks/useFeed';
import { usePost } from '@/src/hooks/usePost';
import { useReportModal } from '@/src/providers/ReportProvider';
import { FeedAlgorithm, FeedScope, feedService } from '@/src/services/feed.service';
import { PostItem } from './PostItem';

interface FeedListProps {
  algorithm: FeedAlgorithm;
  scope: FeedScope;
  showUniversity?: boolean;
  onComment?: (postId: number) => void;
}

export function FeedList({ 
  algorithm, 
  scope, 
  showUniversity = false,
  onComment 
}: FeedListProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'background');
  
  const {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    toggleReaction,
    trackView
  } = useFeed({ algorithm, scope });

  const { deletePost } = usePost();
  const { showReport } = useReportModal();

  const handlePostView = async (postId: number) => {
    // Use the hook's trackView method
    await trackView(postId);
  };

  const handleDeletePost = async (postId: number) => {
    const result = await deletePost(postId);
    if (result.success) {
      // Refresh the feed to remove the deleted post
      await refresh();
    } else {
      // Could show toast/alert with error message
      console.error('Failed to delete post:', result.error);
    }
  };

  const handleReportPost = async (postId: number) => {
    showReport('post', postId);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <PostItem
      post={item}
      showUniversity={showUniversity}
      onReaction={toggleReaction}
      onComment={onComment}
      onView={() => handlePostView(item.id)}
      onDelete={handleDeletePost}
      onReport={handleReportPost}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
        {scope === 'campus' 
          ? 'Be the first to post on your campus!' 
          : 'Check back later for more content.'
        }
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Unable to load feed</Text>
      <Text style={[styles.emptySubtitle, { color: mutedColor }]}>
        {error}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <Text style={[styles.loadingText, { color: mutedColor }]}>
          Loading more posts...
        </Text>
      </View>
    );
  };

  if (error && posts.length === 0) {
    return renderError();
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={(item) => item.id.toString()}
      style={[styles.list, { backgroundColor }]}
      contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.listContent}
      
      // Pull to refresh
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refresh}
          colors={['#007AFF']} // iOS style
          tintColor={'#007AFF'} // Android style
        />
      }
      
      // Infinite scroll
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      
      // Empty state
      ListEmptyComponent={!isLoading ? renderEmpty : null}
      
      // Performance
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
      
      // Styling
      showsVerticalScrollIndicator={false}
      bounces={true}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
});