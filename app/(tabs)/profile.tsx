import React, { useState } from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/src/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs, ProfileTabType } from '@/components/profile/ProfileTabs';
import { UserPostsList } from '@/components/profile/UserPostsList';
import { UserCommentsList } from '@/components/profile/UserCommentsList';
import { UserLikesList } from '@/components/profile/UserLikesList';
import { useCurrentUserProfile } from '@/src/hooks/useProfile';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const { userProfile } = useAuth();
  const profileHook = useCurrentUserProfile();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditProfile = () => {
    // TODO: Navigate to edit profile modal/screen
    console.log('Edit profile pressed');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await profileHook.refresh();
      // Force all tabs to reload by changing key
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Profile refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!userProfile) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text variant="title" style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: mutedColor }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  const renderTabContent = () => {
    if (!profileHook.profile) return null;
    
    switch (activeTab) {
      case 'posts':
        return <UserPostsList key={`posts-${refreshKey}`} userId={profileHook.profile.id} />;
      case 'comments':
        return <UserCommentsList key={`comments-${refreshKey}`} userId={profileHook.profile.id} />;
      case 'likes':
        return <UserLikesList key={`likes-${refreshKey}`} userId={profileHook.profile.id} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text variant="title" style={styles.headerTitle}>Profile</Text>
      </View>
      
      {profileHook.profile && (
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          postsCount={profileHook.profile.postsCount || 0}
          commentsCount={profileHook.profile.commentsCount || 0}
          likesCount={profileHook.profile.reactionsReceived || 0}
          headerComponent={
            <ProfileHeader
              profile={profileHook.profile}
              isOwnProfile={true}
              onEditPress={handleEditProfile}
            />
          }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
        >
        {renderTabContent()}
      </ProfileTabs>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
});