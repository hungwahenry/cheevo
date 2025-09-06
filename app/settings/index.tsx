import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/src/hooks/useAuth';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Beer,
  Bell,
  ChevronRight,
  HelpCircle,
  LogOut,
  Shield,
  User
} from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const settingsItems = [
  {
    id: 'account',
    title: 'Account',
    subtitle: 'Email, delete account',
    icon: User,
    route: '/settings/account',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    subtitle: 'Profile visibility, content engagement',
    icon: Shield,
    route: '/settings/privacy',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Push notifications, preferences',
    icon: Bell,
    route: '/settings/notifications',
  },
  {
    id: 'about',
    title: 'Help & About',
    subtitle: 'Support, terms, app info',
    icon: HelpCircle,
    route: '/settings/about',
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'foreground');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const borderColor = useThemeColor({}, 'border');
  const { signOut } = useAuth();

  const handleBack = () => {
    router.back();
  };

  const handleSettingPress = (route: string) => {
    router.push(route as any);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/welcome');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <Text variant="title" style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Settings List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {settingsItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.settingItem, { backgroundColor: cardColor, borderBottomColor: borderColor }]}
                onPress={() => handleSettingPress(item.route)}
              >
                <View style={styles.settingIcon}>
                  <IconComponent size={20} color={mutedColor} />
                </View>
                
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: textColor }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: mutedColor }]}>
                    {item.subtitle}
                  </Text>
                </View>
                
                <ChevronRight size={16} color={mutedColor} />
              </TouchableOpacity>
            );
          })}

          {/* Sign Out Section */}
          <View style={styles.signOutSection}>
            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: cardColor, borderColor: '#ef4444' }]}
              onPress={handleSignOut}
            >
              <LogOut size={20} color="#ef4444" />
              <Text style={[styles.signOutText, { color: '#ef4444' }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>

          {/* App Info Section */}
          <View style={styles.appInfoSection}>
            <View style={styles.appInfoItem}>
              <Text style={[styles.appVersion, { color: mutedColor }]}>
                Version 1.0.0
              </Text>
            </View>
            
            <View style={[styles.appInfoItem, styles.builtWithLove]}>
              <Beer size={20} color="#ef4444" />
              <Text style={[styles.builtWithLoveText, { color: mutedColor }]}>
                built drunk
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: -32, // Offset back button to center title
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 12,
  },
  settingIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  signOutSection: {
    marginTop: 32,
    paddingBottom: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appInfoSection: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  appInfoItem: {
    alignItems: 'center',
  },
  appVersion: {
    fontSize: 14,
    fontWeight: '500',
  },
  builtWithLove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  builtWithLoveText: {
    fontSize: 13,
    fontWeight: '500',
  },
});