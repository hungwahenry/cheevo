import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useComments } from '@/src/hooks/useComments';
import { useReportModal } from '@/src/providers/ReportProvider';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { CommentInput } from './CommentInput';
import { CommentsList } from './CommentsList';

interface ReplyContext {
  commentId: number;
  username: string;
}

interface CommentsSheetProps {
  isVisible: boolean;
  onClose: () => void;
  postId: number;
  commentsCount?: number;
}

export function CommentsSheet({ 
  isVisible, 
  onClose, 
  postId, 
  commentsCount = 0 
}: CommentsSheetProps) {
  const [replyContext, setReplyContext] = useState<ReplyContext | undefined>();

  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  
  const { showReport } = useReportModal();

  const {
    mainComments,
    getRepliesForComment,
    getReplyCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    createComment,
    deleteComment,
  } = useComments(postId);

  const handleCommentCreated = () => {
    setReplyContext(undefined);
    // No need to call refresh() since optimistic updates handle it
  };

  const handleReplyPress = (commentId: number, username: string) => {
    setReplyContext({ commentId, username });
  };

  const handleCancelReply = () => {
    setReplyContext(undefined);
  };

  const handleReport = (commentId: number) => {
    showReport('comment', commentId);
  };

  const title = commentsCount > 0 ? `Comments (${commentsCount})` : 'Comments';

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: cardColor,
          paddingTop: 5 
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: borderColor
          }}>
            <Text variant="title">{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <X size={24} color={mutedColor} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView style={{ flex: 1 }}>
            <CommentsList
              mainComments={mainComments || []}
              getRepliesForComment={getRepliesForComment}
              getReplyCount={getReplyCount}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore || false}
              hasMore={hasMore || false}
              onRefresh={refresh}
              onReplyPress={handleReplyPress}
              onLoadMore={loadMore}
              deleteComment={deleteComment}
              onReport={handleReport}
            />
          </ScrollView>

          {/* Comment Input */}
          <CommentInput
            replyContext={replyContext}
            onCommentCreated={handleCommentCreated}
            onCancelReply={handleCancelReply}
            createComment={createComment}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}