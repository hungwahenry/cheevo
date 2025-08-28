import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useAuth } from '@/src/hooks/useAuth';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function SplashScreen() {
  const { isAuthenticated, isLoading, hasCompletedOnboarding } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  
  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  // Initialize logo animation - more subtle
  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSequence(
      withSpring(1.05, { damping: 15, stiffness: 150 }),
      withSpring(1, { damping: 12, stiffness: 120 })
    );
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/welcome');
      } else if (!hasCompletedOnboarding) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }, 1500); // Show splash for minimum 1.5s

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, hasCompletedOnboarding]);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }],
      opacity: logoOpacity.value,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={[styles.logo, { backgroundColor: primaryColor }]}>
          <Text variant="heading" style={styles.logoText}>
            C
          </Text>
        </View>
        <Text variant="title" style={styles.appName}>
          Cheevo
        </Text>
        <Text variant="caption" style={styles.tagline}>
          Campus. Anonymous. Unfiltered.
        </Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={primaryColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
  },
  appName: {
    marginBottom: 8,
    fontWeight: '700',
  },
  tagline: {
    opacity: 0.6,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
  },
});