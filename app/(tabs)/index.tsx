import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlgorithmSelector } from '@/components/feed/AlgorithmSelector';
import { FeedList } from '@/components/feed/FeedList';
import { FeedAlgorithm } from '@/src/services/feed.service';

const CAMPUS_ALGORITHMS: FeedAlgorithm[] = ['trending', 'chronological', 'engagement', 'balanced'];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<FeedAlgorithm>('trending');

  const handleReaction = (postId: number) => {
    // TODO: Implement reaction functionality
    console.log('React to post:', postId);
  };

  const handleComment = (postId: number) => {
    // TODO: Implement comment functionality  
    console.log('Comment on post:', postId);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text variant="title" style={styles.headerTitle}>Campus Feed</Text>
      </View>
      
      <AlgorithmSelector
        selected={selectedAlgorithm}
        onSelect={setSelectedAlgorithm}
        algorithms={CAMPUS_ALGORITHMS}
      />
      
      <FeedList
        algorithm={selectedAlgorithm}
        scope="campus"
        showUniversity={false}
        onReaction={handleReaction}
        onComment={handleComment}
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
  },
  headerTitle: {
    marginBottom: 2,
  },
});
