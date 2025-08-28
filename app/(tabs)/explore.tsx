import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { StyleSheet } from 'react-native';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text variant="heading">Explore</Text>
      <Text variant="body">Discover trending posts and topics</Text>
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
});