import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Globe } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlgorithmSelector } from '@/components/feed/AlgorithmSelector';
import { FeedList } from '@/components/feed/FeedList';
import { FeedAlgorithm } from '@/src/services/feed.service';

const GLOBAL_ALGORITHMS: FeedAlgorithm[] = ['trending', 'chronological', 'discovery'];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<FeedAlgorithm>('trending');

  const handleComment = (postId: number) => {
    // TODO: Implement comment functionality
    console.log('Comment on post:', postId);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Globe size={20} color={primaryColor} />
          <View style={styles.headerText}>
            <Text variant="title" style={styles.headerTitle}>Explore</Text>
            <Text style={styles.subtitle}>Posts from all universities</Text>
          </View>
        </View>
      </View>
      
      <AlgorithmSelector
        selected={selectedAlgorithm}
        onSelect={setSelectedAlgorithm}
        algorithms={GLOBAL_ALGORITHMS}
      />
      
      <FeedList
        algorithm={selectedAlgorithm}
        scope="global"
        showUniversity={true}
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
});