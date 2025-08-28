import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { StyleSheet } from 'react-native';

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <Text variant="heading">Campus Feed</Text>
      <Text variant="body">Your university posts will appear here</Text>
      <Text variant="caption" style={styles.hint}>
        Later: Campus ↔ Global toggle will be added
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  hint: {
    marginTop: 8,
    opacity: 0.6,
  },
});
