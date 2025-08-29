import { GifPicker } from '@/components/GifPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { usePost } from '@/src/hooks/usePost';
import { configService } from '@/src/services/config.service';
import { giphyService } from '@/src/services/giphy.service';
import { router } from 'expo-router';
import { Image as ImageIcon, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CreateScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');
  
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
    <View style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
          <Text variant="title">Create Post</Text>
          <Button 
            variant="ghost"
            size="icon"
            icon={X}
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Text Input */}
          <Input
            type="textarea"
            placeholder="What's happening on ur campus?"
            value={content}
            onChangeText={setContent}
            maxLength={maxLength}
            rows={6}
            rightComponent={() => (
              <Text 
                variant="caption" 
                style={[
                  styles.charCounter, 
                  { color: remainingChars < 0 ? '#ef4444' : mutedColor }
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
              style={styles.gifButton}
            >
              Add GIF
            </Button>

            <Button
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              loading={isSubmitting}
              style={styles.postButton}
            >
              📝 Post
            </Button>
          </View>
        </ScrollView>

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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    marginRight: -8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  textInput: {
    marginBottom: 0,
  },
  charCounter: {
    fontSize: 12,
    fontWeight: '500',
  },
  gifPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  gifImage: {
    width: '100%',
    height: 200,
  },
  removeGif: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  gifButton: {
    flex: 0,
  },
  postButton: {
    flex: 1,
  },
});

export default CreateScreen;