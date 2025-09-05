import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Send, X, Image as ImageIcon } from 'lucide-react-native';
import { GifPicker } from '@/components/GifPicker';
import { giphyService, GiphyGif } from '@/src/services/giphy.service';

interface ReplyContext {
  commentId: number;
  username: string;
}

interface CommentInputProps {
  replyContext?: ReplyContext;
  onCommentCreated: () => void;
  onCancelReply?: () => void;
  createComment: (content: string, parentCommentId?: number, giphyUrl?: string) => Promise<{ success: boolean; message?: string }>;
}

export function CommentInput({ 
  replyContext,
  onCommentCreated,
  onCancelReply,
  createComment
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  
  useEffect(() => {
    const initialContent = replyContext ? `@${replyContext.username} ` : '';
    setContent(initialContent);
    // Clear GIF when reply context changes
    setSelectedGif(null);
  }, [replyContext]);
  
  const backgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const textColor = useThemeColor({}, 'foreground');
  const primaryColor = useThemeColor({}, 'primary');
  
  const [isCreating, setIsCreating] = useState(false);
  const isReplyMode = !!replyContext;

  const handleSelectGif = (gif: GiphyGif) => {
    const optimizedUrl = giphyService.getOptimizedGifUrl(gif, 'fixed_height');
    setSelectedGif(optimizedUrl);
  };

  const removeGif = () => {
    setSelectedGif(null);
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !selectedGif) || isCreating) return;

    const commentContent = content.trim();
    const gifUrl = selectedGif;
    
    // 1. IMMEDIATELY clear input and re-enable for better UX (optimistic update)
    setContent('');
    setSelectedGif(null);
    onCommentCreated();
    
    // Brief loading state just for visual feedback on send button
    setIsCreating(true);
    setTimeout(() => setIsCreating(false), 300);
    
    // API call happens in background without blocking UI
    try {
      const result = await createComment(
        commentContent || (gifUrl ? ' ' : ''), // Ensure some content if only GIF
        replyContext?.commentId,
        gifUrl || undefined
      );
      
      if (!result.success) {
        // If failed, restore the content and show error
        setContent(commentContent);
        setSelectedGif(gifUrl);
        Alert.alert('Error', result.message || 'Failed to post comment');
      }
    } catch (error) {
      // If error, restore the content and show error
      setContent(commentContent);
      setSelectedGif(gifUrl);
      Alert.alert('Error', 'Failed to post comment');
    }
  };

  const canSubmit = (content.trim().length > 0 || selectedGif) && !isCreating;
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
      
      {/* Selected GIF Preview */}
      {selectedGif && (
        <View style={styles.gifPreviewContainer}>
          <View style={styles.gifPreview}>
            <Image
              source={{ uri: selectedGif }}
              style={styles.gifImage}
              contentFit="cover"
            />
            <TouchableOpacity
              onPress={removeGif}
              style={[styles.removeGifButton, { backgroundColor: mutedColor }]}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>
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
          onPress={() => setShowGifPicker(true)}
          disabled={isCreating}
          style={[styles.gifButton, { opacity: isCreating ? 0.5 : 1 }]}
        >
          <ImageIcon size={20} color={mutedColor} />
        </TouchableOpacity>
        
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
      
      {/* GIF Picker Modal */}
      <GifPicker
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleSelectGif}
      />
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
  gifPreviewContainer: {
    marginBottom: 12,
  },
  gifPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gifImage: {
    width: 120,
    height: 80,
    borderRadius: 12,
  },
  removeGifButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifButton: {
    padding: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});