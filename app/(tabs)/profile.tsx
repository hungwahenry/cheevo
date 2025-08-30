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

  const handleEditProfile = () => {
    // TODO: Navigate to edit profile modal/screen
    console.log('Edit profile pressed');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await profileHook.refresh();
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
    switch (activeTab) {
      case 'posts':
        return <UserPostsList userId={userProfile.id} />;
      case 'comments':
        return <UserCommentsList userId={userProfile.id} />;
      case 'likes':
        return <UserLikesList userId={userProfile.id} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text variant="title" style={styles.headerTitle}>Profile</Text>
      </View>
      
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        postsCount={userProfile.postsCount}
        commentsCount={userProfile.commentsCount}
        likesCount={userProfile.reactionsReceived}
        headerComponent={
          <ProfileHeader
            profile={userProfile}
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