import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Globe } from 'lucide-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const mutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Globe size={20} color={primaryColor} />
          <View style={styles.headerText}>
            <Text variant="title" style={styles.headerTitle}>Explore</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.content}>
        <Globe size={48} color={mutedColor} />
        <Text variant="heading" style={styles.placeholderText}>
          Global Explore Feed will appear here
        </Text>
        <Text variant="body" style={[styles.subText, { color: mutedColor }]}>
          Coming soon - posts from universities nationwide
        </Text>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  placeholderText: {
    textAlign: 'center',
  },
  subText: {
    textAlign: 'center',
  },
});