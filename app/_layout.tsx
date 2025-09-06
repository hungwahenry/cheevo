import { ThemeProvider } from '@/theme/theme-provider';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { CommentsProvider } from '@/src/providers/CommentsProvider';
import { ReportProvider } from '@/src/providers/ReportProvider';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ReportProvider>
            <CommentsProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen 
                  name="create" 
                  options={{
                    presentation: 'modal',
                    headerShown: false,
                  }}
                />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </CommentsProvider>
          </ReportProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
