import React from 'react';
import { StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useNotificationSettings } from '@/src/hooks/useNotificationSettings';
import { 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Users,
  Info
} from 'lucide-react-native';

export default function NotificationsScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const primaryColor = useThemeColor({}, 'primary');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  
  const {
    socialNotifications,
    contentNotifications,
    trendingNotifications,
    communityNotifications,
    updateSetting,
    loading,
    error
  } = useNotificationSettings();

  const renderToggleItem = (
    icon: any,
    title: string,
    subtitle: string,
    value: boolean,
    settingKey: 'socialNotifications' | 'contentNotifications' | 'trendingNotifications' | 'communityNotifications'
  ) => {
    const IconComponent = icon;
    return (
      <View style={styles.toggleItem}>
        <View style={styles.toggleContent}>
          <View style={styles.iconContainer}>
            <IconComponent size={20} color={mutedColor} />
          </View>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>{title}</Text>
            <Text style={[styles.toggleSubtitle, { color: mutedColor }]}>{subtitle}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={(newValue) => updateSetting(settingKey, newValue)}
          trackColor={{ false: '#f3f4f6', true: `${primaryColor}40` }}
          thumbColor={value ? primaryColor : '#ffffff'}
          ios_backgroundColor="#f3f4f6"
          disabled={loading}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsHeader title="Notifications" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          <Text style={[styles.description, { color: mutedColor }]}>
            Control when and how you receive notifications from Cheeeevo. Changes are saved automatically.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Social Notifications */}
          <SettingsSection 
            title="Social Activity" 
            subtitle="Interactions with your content and profile"
          >
            {renderToggleItem(
              Heart,
              'Likes & Reactions',
              'When someone reacts to your posts or comments',
              socialNotifications,
              'socialNotifications'
            )}
            
            {renderToggleItem(
              MessageCircle,
              'Comments & Replies',
              'When someone comments on your posts or replies to you',
              contentNotifications,
              'contentNotifications'
            )}
            
            {renderToggleItem(
              Users,
              'Followers & Mentions',
              'When someone follows you or mentions your username',
              communityNotifications,
              'communityNotifications'
            )}
          </SettingsSection>

          {/* Content & Community */}
          <SettingsSection 
            title="Content & Community" 
            subtitle="Updates about trending content and your university"
          >
            {renderToggleItem(
              TrendingUp,
              'Trending & Weekly Digest',
              'Weekly summaries and when your posts trend',
              trendingNotifications,
              'trendingNotifications'
            )}
          </SettingsSection>


          {/* Info Section */}
          <SettingsSection 
            title="About Notifications" 
            subtitle="How notifications work"
          >
            <SettingsItem
              icon={Info}
              title="Notification Info"
              subtitle="Learn about notification types and delivery"
              onPress={() => {
                Alert.alert(
                  'Notification Info',
                  'Social Activity: Get notified when others like, comment on, or reply to your posts, or when someone follows you or mentions your username.\n\n' +
                  'Content & Community: Receive weekly digests and notifications when your posts trend within your university community.\n\n' +
                  'Delivery: Notifications are sent as push notifications to your device. You can manage push notification permissions in your device settings.\n\n' +
                  'Privacy: We only send notifications for public interactions and respect your privacy settings. Critical security alerts cannot be disabled.',
                  [{ text: 'Got it', style: 'default' }]
                );
              }}
            />
          </SettingsSection>

          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: mutedColor }]}>
              Push notifications require permission from your device settings. 
              Some notifications like security alerts cannot be disabled.
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
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 2,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
});