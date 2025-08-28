import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/src/hooks/useAuth';
import { validation } from '@/src/utils/validation';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const { sendOTP, isLoading, error, clearError } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Animation values
  const contentOpacity = useSharedValue(0);

  React.useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  React.useEffect(() => {
    if (error) {
      setEmailError(error);
      clearError();
    }
  }, [error]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      setEmailError(null);
    }
  };

  const handleSendOTP = async () => {
    // Validate email
    const emailValidation = validation.email(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error!);
      return;
    }

    // Send OTP
    const success = await sendOTP(email);
    if (success) {
      router.push(`/(auth)/verify-otp?email=${encodeURIComponent(email)}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <StatusBar style="auto" />
      <View style={[styles.container, { backgroundColor, paddingTop: insets.top }]}>
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <Button 
              variant="ghost" 
              size="icon"
              onPress={handleBack}
            >
              ←
            </Button>
            <Text variant="title">Sign In</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.titleSection}>
              <Text variant="heading" style={styles.title}>
                What's your email?
              </Text>
              <Text variant="body" style={styles.subtitle}>
                We'll send you a verification code to sign in or create your account.
              </Text>
            </View>

            <View style={styles.formSection}>
              <Input
                placeholder="Enter your email address"
                value={email}
                onChangeText={handleEmailChange}
                error={emailError || undefined}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                icon={Mail}
                containerStyle={styles.input}
              />
            </View>
          </View>

          {/* Button */}
          <View style={styles.buttonSection}>
            <Button 
              size="lg"
              onPress={handleSendOTP}
              loading={isLoading}
              disabled={!email.trim() || isLoading}
              style={styles.continueButton}
            >
              Continue
            </Button>
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 20,
  },
  titleSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    marginBottom: 12,
    lineHeight: 36,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 24,
    maxWidth: width - 80,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 60,
  },
  input: {
    marginBottom: 20,
  },
  buttonSection: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  continueButton: {
    minWidth: width - 48,
  },
});