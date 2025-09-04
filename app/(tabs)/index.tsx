import { AlgorithmSelector } from '@/components/feed/AlgorithmSelector';
import { FeedList } from '@/components/feed/FeedList';
import { CommentsSheet } from '@/components/comments/CommentsSheet';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/src/hooks/useAuth';
import { FeedAlgorithm } from '@/src/services/feed.service';
import { School } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAMPUS_ALGORITHMS: FeedAlgorithm[] = ['trending', 'chronological', 'balanced'];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  const { userProfile } = useAuth();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<FeedAlgorithm>('trending');
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  
  const campusName = userProfile?.university?.name || 'Campus';

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
          <School size={20} color={primaryColor} />
          <View style={styles.headerText}>
            <Text variant="title" style={styles.headerTitle}>Campus Feed</Text>
            <Text style={styles.subtitle}>{campusName}</Text>
          </View>
        </View>
      </View>
      
      <AlgorithmSelector
        selected={selectedAlgorithm}
        onSelect={setSelectedAlgorithm}
        algorithms={CAMPUS_ALGORITHMS}
      />
      
      <FeedList
        algorithm={selectedAlgorithm}
        scope="campus"
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
