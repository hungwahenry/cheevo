import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { usePrivacySettings } from '@/src/hooks/usePrivacySettings';
import { type ProfileVisibility, type ContentEngagement } from '@/src/services/privacy.service';
import { Eye, MessageCircle, Heart, Flag, UserX } from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';


export default function PrivacySettingsScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const { 
    settings, 
    loading, 
    error, 
    updateProfileVisibility, 
    updateContentEngagement 
  } = usePrivacySettings();

  const handleProfileVisibilityChange = async (visibility: ProfileVisibility) => {
    const success = await updateProfileVisibility(visibility);
    if (!success && error) {
      Alert.alert('Error', 'Failed to update profile visibility. Please try again.');
    }
  };

  const handleContentEngagementChange = async (type: 'react' | 'comment', setting: ContentEngagement) => {
    const success = await updateContentEngagement(type, setting);
    if (!success && error) {
      Alert.alert('Error', 'Failed to update content engagement settings. Please try again.');
    }
  };

  const getVisibilityLabel = (visibility: ProfileVisibility) => {
    switch (visibility) {
      case 'everyone': return 'Everyone';
      case 'university': return 'University Only';
      case 'nobody': return 'Nobody';
    }
  };

  const getEngagementLabel = (engagement: ContentEngagement) => {
    switch (engagement) {
      case 'everyone': return 'Everyone';
      case 'university': return 'University Only';
    }
  };

  const showVisibilityOptions = () => {
    Alert.alert(
      'Profile Visibility',
      'Who can see your profile information?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Everyone', 
          onPress: () => handleProfileVisibilityChange('everyone')
        },
        { 
          text: 'University Only', 
          onPress: () => handleProfileVisibilityChange('university')
        },
        { 
          text: 'Nobody', 
          onPress: () => handleProfileVisibilityChange('nobody')
        },
      ]
    );
  };

  const showReactionOptions = () => {
    Alert.alert(
      'Who Can React',
      'Who can react to your posts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Everyone', 
          onPress: () => handleContentEngagementChange('react', 'everyone')
        },
        { 
          text: 'University Only', 
          onPress: () => handleContentEngagementChange('react', 'university')
        },
      ]
    );
  };

  const showCommentOptions = () => {
    Alert.alert(
      'Who Can Comment',
      'Who can comment on your posts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Everyone', 
          onPress: () => handleContentEngagementChange('comment', 'everyone')
        },
        { 
          text: 'University Only', 
          onPress: () => handleContentEngagementChange('comment', 'university')
        },
      ]
    );
  };

  const handleViewReports = () => {
    router.push('/settings/reports');
  };

  const handleViewBlockedUsers = () => {
    router.push('/settings/blocked-users');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <SettingsHeader title="Privacy" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Profile Visibility Section */}
          <SettingsSection 
            title="Profile Visibility" 
            subtitle="Control who can see your profile information"
          >
            <SettingsItem
              icon={Eye}
              title="Profile Visibility"
              subtitle={`Currently: ${settings ? getVisibilityLabel(settings.profileVisibility) : 'Loading...'}`}
              onPress={showVisibilityOptions}
              disabled={loading}
            />
          </SettingsSection>

          {/* Content Engagement Section */}
          <SettingsSection 
            title="Content Engagement" 
            subtitle="Control who can interact with your posts"
          >
            <SettingsItem
              icon={Heart}
              title="Who Can React"
              subtitle={`Currently: ${settings ? getEngagementLabel(settings.whoCanReact) : 'Loading...'}`}
              onPress={showReactionOptions}
              disabled={loading}
            />
            
            <SettingsItem
              icon={MessageCircle}
              title="Who Can Comment"
              subtitle={`Currently: ${settings ? getEngagementLabel(settings.whoCanComment) : 'Loading...'}`}
              onPress={showCommentOptions}
              disabled={loading}
            />
          </SettingsSection>

          {/* Safety & Moderation Section */}
          <SettingsSection 
            title="Safety & Moderation" 
            subtitle="Manage your reports and blocked users"
          >
            <SettingsItem
              icon={Flag}
              title="Reports History"
              subtitle="View your report history and status"
              onPress={handleViewReports}
            />
            
            <SettingsItem
              icon={UserX}
              title="Blocked Users"
              subtitle="Manage users you've blocked"
              onPress={handleViewBlockedUsers}
            />
          </SettingsSection>

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
});