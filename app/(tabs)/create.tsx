import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GifPicker } from '@/components/GifPicker';
import { usePost } from '@/src/hooks/usePost';
import { configService } from '@/src/services/config.service';
import { giphyService } from '@/src/services/giphy.service';
import { router } from 'expo-router';
import { Image as ImageIcon, MessageCircle, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';

function CreateScreen() {
  const { createPost, isSubmitting } = usePost();
  const [content, setContent] = useState('');
  const [maxLength, setMaxLength] = useState(280);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);

  useEffect(() => {
    loadMaxLength();
  }, []);

  const loadMaxLength = async () => {
    const limits = await configService.getContentLimits();
    setMaxLength(limits.maxPostLength);
  };

  const handleSelectGif = (gif: any) => {
    const optimizedUrl = giphyService.getOptimizedGifUrl(gif, 'fixed_height');
    setSelectedGif(optimizedUrl);
  };

  const removeGif = () => {
    setSelectedGif(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    const result = await createPost(content, selectedGif || undefined);

    if (result.success) {
      // Show success message based on status
      if (result.status === 'published') {
        Alert.alert('Success!', result.message);
      } else if (result.status === 'pending_review') {
        Alert.alert('Under Review', result.message);
      }
      
      // Handle ban info if present
      if (result.banInfo?.shouldBanUser) {
        Alert.alert(
          'Account Status', 
          `Your account has been restricted for ${result.banInfo.banDuration} days due to policy violations.`,
          [{ text: 'OK' }]
        );
      }
      
      // Reset form and go back
      setContent('');
      setSelectedGif(null);
      router.back();
    } else {
      Alert.alert('Error', result.message || 'Failed to create post');
    }
  };

  const isSubmitDisabled = !content.trim() || content.length > maxLength || isSubmitting;
  const remainingChars = maxLength - content.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="title">Create Post</Text>
      </View>

      <View style={styles.content}>
        {/* Text Input */}
        <Input
          type="textarea"
          placeholder="What's happening on campus?"
          value={content}
          onChangeText={setContent}
          maxLength={maxLength}
          rows={6}
          rightComponent={() => (
            <Text 
              variant="caption" 
              style={[
                styles.charCounter, 
                { color: remainingChars < 0 ? '#ef4444' : undefined }
              ]}
            >
              {remainingChars}
            </Text>
          )}
          containerStyle={styles.textInput}
        />

        {/* Selected GIF Preview */}
        {selectedGif && (
          <View style={styles.gifPreview}>
            <Image 
              source={{ uri: selectedGif }} 
              style={styles.gifImage} 
              resizeMode="cover"
            />
            <TouchableOpacity style={styles.removeGif} onPress={removeGif}>
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            icon={ImageIcon}
            onPress={() => setShowGifPicker(true)}
          >
            Add GIF
          </Button>

          <Button
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            loading={isSubmitting}
            icon={MessageCircle}
          >
            Post
          </Button>
        </View>
      </View>

      {/* GIF Picker */}
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
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: 20,
    paddingTop: 60, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  textInput: {
    marginBottom: 16,
  },
  charCounter: {
    fontSize: 14,
  },
  gifPreview: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gifImage: {
    width: '100%',
    height: 200,
  },
  removeGif: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
});

export default CreateScreen;