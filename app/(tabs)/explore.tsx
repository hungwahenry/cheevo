import { CommentsSheet } from '@/components/comments/CommentsSheet';
import { AlgorithmSelector } from '@/components/feed/AlgorithmSelector';
import { FeedList } from '@/components/feed/FeedList';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FeedAlgorithm } from '@/src/services/feed.service';
import { Globe } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GLOBAL_ALGORITHMS: FeedAlgorithm[] = ['trending', 'chronological', 'discovery'];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<FeedAlgorithm>('trending');
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const handleComment = (postId: number) => {
    setSelectedPostId(postId);
    setCommentsVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsVisible(false);
    setSelectedPostId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Globe size={20} color={primaryColor} />
          <View style={styles.headerText}>
            <Text variant="title" style={styles.headerTitle}>Explore</Text>
            <Text style={styles.subtitle}>Posts from all campuses</Text>
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

      {/* Comments Modal */}
      {selectedPostId && (
        <CommentsSheet
          isVisible={commentsVisible}
          onClose={handleCloseComments}
          postId={selectedPostId}
        />
      )}
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