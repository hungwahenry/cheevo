import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { View } from '@/components/ui/view';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useCreateComment } from '@/src/hooks/useCreateComment';
import { Send, X } from 'lucide-react-native';

interface ReplyContext {
  commentId: number;
  username: string;
}

interface CommentInputProps {
  postId: number;
  replyContext?: ReplyContext;
  onCommentCreated: () => void;
  onCancelReply?: () => void;
}

export function CommentInput({ 
  postId, 
  replyContext,
  onCommentCreated,
  onCancelReply
}: CommentInputProps) {
  const [content, setContent] = useState('');
  
  // Auto-prefill with @mention when replying - update when replyContext changes
  useEffect(() => {
    const initialContent = replyContext ? `@${replyContext.username} ` : '';
    setContent(initialContent);
  }, [replyContext]);
  
  const backgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const textColor = useThemeColor({}, 'foreground');
  const primaryColor = useThemeColor({}, 'primary');
  
  const { createComment, isCreating } = useCreateComment(postId);
  const isReplyMode = !!replyContext;

  const handleSubmit = async () => {
    if (!content.trim() || isCreating) return;

    try {
      const result = await createComment(
        content.trim(), 
        replyContext?.commentId
      );
      
      if (result.success) {
        setContent('');
        onCommentCreated();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment');
    }
  };

  const placeholder = isReplyMode 
    ? `Reply to ${replyContext.username}...` 
    : 'Add a comment...';

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor, borderTopColor: borderColor }]}>
        {/* Reply Header */}
        {isReplyMode && (
          <View style={styles.replyHeader}>
            <View style={styles.replyIndicator}>
              <Text style={[styles.replyText, { color: mutedColor }]}>
                Replying to @{replyContext.username}
              </Text>
            </View>
            {onCancelReply && (
              <Button variant="ghost" size="sm" onPress={onCancelReply} style={styles.cancelButton}>
                <X size={14} color={mutedColor} />
              </Button>
            )}
          </View>
        )}
        
        {/* Input Row */}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.textInput, { color: textColor, borderColor }]}
            placeholder={placeholder}
            placeholderTextColor={mutedColor}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={280}
            editable={!isCreating}
            textAlignVertical="center"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onPress={handleSubmit}
            disabled={!content.trim() || isCreating}
            style={styles.sendButton}
          >
            <Send 
              size={18} 
              color={!content.trim() || isCreating ? mutedColor : primaryColor} 
            />
          </Button>
        </View>
        
        {/* Character Count */}
        {content.length > 200 && (
          <Text style={[styles.charCount, { 
            color: content.length > 280 ? '#ef4444' : mutedColor 
          }]}>
            {content.length}/280
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  replyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cancelButton: {
    padding: 2,
    minHeight: 24,
    minWidth: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 80,
    fontSize: 16,
  },
  sendButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    minWidth: 36,
    height: 36,
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
});