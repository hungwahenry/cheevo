import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { View } from '@/components/ui/view';
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

  const canSubmit = content.trim().length > 0 && !isCreating;
  const placeholder = isReplyMode 
    ? `Reply to @${replyContext.username}...` 
    : 'Add a comment...';

  return (
    <View style={[styles.container, { backgroundColor, borderTopColor: borderColor }]}>
      {/* Reply Header */}
      {isReplyMode && (
        <View style={styles.replyHeader}>
          <View style={[styles.replyBadge, { backgroundColor: `${primaryColor}15` }]}>
            <Text style={[styles.replyText, { color: primaryColor }]}>
              Replying to @{replyContext.username}
            </Text>
          </View>
          {onCancelReply && (
            <TouchableOpacity 
              onPress={onCancelReply}
              style={styles.cancelButton}
            >
              <X size={16} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Input Container */}
      <View style={[styles.inputContainer, { borderColor }]}>
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          placeholder={placeholder}
          placeholderTextColor={mutedColor}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={280}
          editable={!isCreating}
          textAlignVertical="top"
          returnKeyType="send"
          onSubmitEditing={canSubmit ? handleSubmit : undefined}
        />
        
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.sendButton,
            { 
              backgroundColor: canSubmit ? primaryColor : mutedColor + '30',
              opacity: canSubmit ? 1 : 0.6
            }
          ]}
        >
          <Send 
            size={18} 
            color={canSubmit ? 'white' : mutedColor} 
          />
        </TouchableOpacity>
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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  replyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  replyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    minHeight: 24,
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
});