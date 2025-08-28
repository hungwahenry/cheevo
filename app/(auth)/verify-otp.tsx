import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { APP_CONFIG } from '@/src/constants/app';
import { useAuth } from '@/src/hooks/useAuth';
import { validation } from '@/src/utils/validation';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, TextInput } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function VerifyOTPScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOTP, sendOTP, isLoading, error, clearError } = useAuth();
  
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Animation values
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  useEffect(() => {
    if (error) {
      setOtpError(error);
      clearError();
    }
  }, [error]);

  // Start resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (otpError) {
      setOtpError(null);
    }

    // Auto-advance to next input
    if (value && index < APP_CONFIG.OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits entered
    if (value && index === APP_CONFIG.OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === APP_CONFIG.OTP_LENGTH) {
        handleVerifyOTP(fullOtp);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const codeToVerify = otpCode || otp.join('');
    
    // Validate OTP
    const otpValidation = validation.otpCode(codeToVerify);
    if (!otpValidation.isValid) {
      setOtpError(otpValidation.error!);
      return;
    }

    if (!email) {
      setOtpError('Email not found. Please try again.');
      return;
    }

    // Verify OTP
    const result = await verifyOTP(email, codeToVerify);
    if (result.success) {
      // Let the splash screen routing logic handle where to go next
      // This ensures consistent routing based on auth state
      router.replace('/');
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || !email) return;
    
    const success = await sendOTP(email);
    if (success) {
      setResendCooldown(APP_CONFIG.OTP_RESEND_COOLDOWN);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
  const canResend = resendCooldown === 0 && !isLoading;
  const otpString = otp.join('');

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
            <Text variant="title">Verify Code</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.titleSection}>
              <Text variant="heading" style={styles.title}>
                Enter verification code
              </Text>
              <Text variant="body" style={styles.subtitle}>
                We sent a 6-digit code to {maskedEmail}
              </Text>
            </View>

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    { borderColor, color: textColor },
                    digit && { borderColor: primaryColor },
                    otpError && { borderColor: '#f26419' }
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  maxLength={1}
                  keyboardType="numeric"
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {otpError && (
              <Text style={styles.errorText}>{otpError}</Text>
            )}

            {/* Resend Section */}
            <View style={styles.resendSection}>
              <Text variant="body" style={styles.resendText}>
                Didn't receive the code?{' '}
              </Text>
              <Button
                variant="link"
                onPress={handleResendOTP}
                disabled={!canResend}
                style={styles.resendButton}
              >
                {canResend ? 'Resend' : `Resend in ${resendCooldown}s`}
              </Button>
            </View>
          </View>

          {/* Button */}
          <View style={styles.buttonSection}>
            <Button 
              size="lg"
              onPress={() => handleVerifyOTP()}
              loading={isLoading}
              disabled={otpString.length !== APP_CONFIG.OTP_LENGTH || isLoading}
              style={styles.verifyButton}
            >
              Verify Code
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
  },
  errorText: {
    color: '#f26419',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    opacity: 0.7,
  },
  resendButton: {
    paddingHorizontal: 0,
    height: 'auto',
  },
  buttonSection: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  verifyButton: {
    minWidth: width - 48,
  },
});