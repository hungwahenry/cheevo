import React from 'react';
import { StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useThemeColor } from '@/hooks/useThemeColor';
import { 
  MessageCircle, 
  Mail, 
  FileText, 
  Shield, 
  Info, 
  ExternalLink,
  Heart
} from 'lucide-react-native';

export default function SupportScreen() {
  const backgroundColor = useThemeColor({}, 'background');

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you would like to contact us:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => {
            Linking.openURL('mailto:support@cheeeevo.com?subject=Support Request');
          }
        },
        {
          text: 'Discord',
          onPress: () => {
            // Replace with your actual Discord invite link
            Linking.openURL('https://discord.gg/cheeeevo');
          }
        }
      ]
    );
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:feedback@cheeeevo.com?subject=App Feedback');
  };

  const handlePrivacyPolicy = () => {
    // Replace with your actual privacy policy URL
    Linking.openURL('https://cheeeevo.com/privacy');
  };

  const handleTermsOfService = () => {
    // Replace with your actual terms of service URL
    Linking.openURL('https://cheeeevo.com/terms');
  };

  const handleCommunityGuidelines = () => {
    // Replace with your actual community guidelines URL
    Linking.openURL('https://cheeeevo.com/guidelines');
  };

  const handleAbout = () => {
    Alert.alert(
      'About Cheeeevo',
      'Cheeeevo is a university-focused social platform where students can connect, share, and discover content within their academic community.\n\nVersion: 1.0.0\nBuilt with ❤️ for students',
      [{ text: 'OK' }]
    );
  };

  const handleDonate = () => {
    Alert.alert(
      'Support Cheeeevo',
      'Love using Cheeeevo? Consider supporting us to keep the platform running and growing!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy us a Coffee ☕',
          onPress: () => {
            // Replace with your actual donation/coffee link
            Linking.openURL('https://buymeacoffee.com/cheeeevo');
          }
        },
        {
          text: 'Patreon',
          onPress: () => {
            // Replace with your actual Patreon link
            Linking.openURL('https://patreon.com/cheeeevo');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsHeader title="Help & Support" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Support Section */}
          <SettingsSection 
            title="Get Help" 
            subtitle="Need assistance? We're here to help"
          >
            <SettingsItem
              icon={MessageCircle}
              title="Contact Support"
              subtitle="Get help with technical issues or account problems"
              onPress={handleContactSupport}
            />
            
            <SettingsItem
              icon={Mail}
              title="Send Feedback"
              subtitle="Share your thoughts and suggestions"
              onPress={handleFeedback}
            />
          </SettingsSection>

          {/* Legal Section */}
          <SettingsSection 
            title="Legal & Policies" 
            subtitle="Important information about using Cheeeevo"
          >
            <SettingsItem
              icon={Shield}
              title="Privacy Policy"
              subtitle="How we handle your data and privacy"
              onPress={handlePrivacyPolicy}
            />
            
            <SettingsItem
              icon={FileText}
              title="Terms of Service"
              subtitle="Terms and conditions for using Cheeeevo"
              onPress={handleTermsOfService}
            />
            
            <SettingsItem
              icon={ExternalLink}
              title="Community Guidelines"
              subtitle="Rules for a safe and respectful community"
              onPress={handleCommunityGuidelines}
            />
          </SettingsSection>

          {/* About Section */}
          <SettingsSection 
            title="About Cheeeevo" 
            subtitle="Learn more about our platform"
          >
            <SettingsItem
              icon={Info}
              title="App Information"
              subtitle="Version info and platform details"
              onPress={handleAbout}
            />
            
            <SettingsItem
              icon={Heart}
              title="Support the Project"
              subtitle="Help us keep Cheeeevo running and growing"
              onPress={handleDonate}
            />
          </SettingsSection>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Made with ❤️ for university students
            </Text>
            <Text style={styles.footerSubtext}>
              Cheeeevo • Version 1.0.0
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 16,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  footerSubtext: {
    fontSize: 12,
    opacity: 0.5,
  },
});