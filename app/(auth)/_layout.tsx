import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="email" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}