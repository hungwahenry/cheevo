import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text variant="heading">Profile</Text>
      <Text variant="body">User profile and settings</Text>
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