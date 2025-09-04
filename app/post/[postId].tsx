import React, { useState } from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { PostItem } from '@/components/feed/PostItem';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Spinner } from '@/components/ui/spinner';
import { CommentsList } from '@/components/comments/CommentsList';
import { CommentInput } from '@/components/comments/CommentInput';

import { useThemeColor } from '@/hooks/useThemeColor';
import { useComments } from '@/src/hooks/useComments';
import { useSinglePost } from '@/src/hooks/useSinglePost';
import { usePost } from '@/src/hooks/usePost';

interface ReplyContext {
  commentId: number;
  username: string;
}

export default function PostDetailsPage() {
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');

  const [replyContext, setReplyContext] = useState<ReplyContext | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { post, isLoading: postLoading, error: postError, refresh: refreshPost } = useSinglePost(parseInt(postId || '0'));
  const { deletePost } = usePost();

  const {
    mainComments,
    getRepliesForComment,
    getReplyCount,
    isLoading: commentsLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh: refreshComments,
  } = useComments(parseInt(postId || '0'));

  const handleCommentCreated = () => {
    setReplyContext(undefined);
    refreshComments();
  };

  const handleReplyPress = (commentId: number, username: string) => {
    setReplyContext({ commentId, username });
  };

  const handleCancelReply = () => {
    setReplyContext(undefined);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshPost(), refreshComments()]);
    setIsRefreshing(false);
  };

  const handlePostDelete = async (postId: number) => {
    const result = await deletePost(postId);
    if (result.success) {
      router.back();
    }
  };

  if (postLoading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={24} />
          </Button>
          <Text style={styles.headerTitle}>Post</Text>
        </View>
        <View style={styles.centerContainer}>
          <Spinner size="lg" />
          <Text style={[styles.loadingText, { color: mutedColor }]}>
            Loading post...
          </Text>
        </View>
      </View>
    );
  }

  if (postError || !post) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={24} />
          </Button>
          <Text style={styles.headerTitle}>Post</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{postError || 'Post not found'}</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
        <Button variant="ghost" size="icon" onPress={() => router.back()}>
          <ArrowLeft size={24} />
        </Button>
        <Text style={styles.headerTitle}>Post</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={primaryColor}
          />
        }
      >
        {/* Post - seamless integration */}
        <View style={{ padding: 16 }}>
          <PostItem 
            post={post} 
            showUniversity={true} 
            onDelete={handlePostDelete}
          />
        </View>

        {/* Comments - seamless integration */}
        <CommentsList
          mainComments={mainComments}
          getRepliesForComment={getRepliesForComment}
          getReplyCount={getReplyCount}
          isLoading={commentsLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onRefresh={refreshComments}
          onReplyPress={handleReplyPress}
          onLoadMore={loadMore}
        />
      </ScrollView>

      {/* Smart Comment Input */}
      <CommentInput
        postId={parseInt(postId || '0')}
        replyContext={replyContext}
        onCommentCreated={handleCommentCreated}
        onCancelReply={handleCancelReply}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});