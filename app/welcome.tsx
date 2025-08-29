import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Dimensions, Image, StyleSheet } from 'react-native'; // Import Image
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  
  // Animation values
  const logoOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  // Initialize animations with more subtle timing
  React.useEffect(() => {
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 800 }));
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    buttonOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handleGetStarted = () => {
    router.push('/(auth)/email');
  };

  return (
    <>
      <StatusBar style="auto" />
      <View style={[styles.container, { backgroundColor, paddingTop: insets.top }]}>
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, logoAnimatedStyle]}>
          {/* Replaced Text and View with Image */}
          <Image 
            source={require('@/assets/images/logo.png')} // Adjust the path if necessary
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </Animated.View>

        {/* Content Section */}
        <Animated.View style={[styles.contentSection, contentAnimatedStyle]}>
          <Text variant="heading" style={styles.welcomeTitle}>
            what's happening on your campus?
          </Text>
          
          <Text variant="body" style={styles.description}>
            join thousands of students sharing campus news, events, and more—all while staying completely anonymous.
          </Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>🎓</Text>
              <Text variant="body" style={styles.featureText}>
                University-specific feeds
              </Text>
            </View>
            
            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>🔥</Text>
              <Text variant="body" style={styles.featureText}>
                React to trending posts
              </Text>
            </View>
            
            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>👤</Text>
              <Text variant="body" style={styles.featureText}>
                Stay completely anonymous
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Button Section */}
        <Animated.View style={[styles.buttonSection, buttonAnimatedStyle]}>
          <Button 
            size="lg" 
            onPress={handleGetStarted}
            style={styles.getStartedButton}
          >
            Get Started
          </Button>
          
          <Text variant="caption" style={styles.disclaimer}>
            By continuing, you agree to our terms and privacy policy
          </Text>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // New style for the image
  logoImage: {
    width: 200, // Adjust width as needed for your logo
    height: 100, // Adjust height as needed
    marginBottom: 20,
  },
  contentSection: {
    flex: 3,
    alignItems: 'center',
    paddingTop: 20,
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: width - 80,
    lineHeight: 38,
  },
  description: {
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: width - 60,
    lineHeight: 24,
    opacity: 0.8,
  },
  features: {
    gap: 24,
    alignItems: 'flex-start',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    maxWidth: width - 80,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
  },
  buttonSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    alignItems: 'center',
  },
  getStartedButton: {
    marginBottom: 16,
    minWidth: width - 80,
  },
  disclaimer: {
    textAlign: 'center',
    opacity: 0.6,
    maxWidth: width - 100,
  },
});