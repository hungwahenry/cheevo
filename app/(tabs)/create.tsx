import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';

export default function CreateScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-2xl font-bold mb-4">Create Post</Text>
      <Text className="text-muted-foreground text-center">
        Create post functionality will be implemented here
      </Text>
    </View>
  );
}