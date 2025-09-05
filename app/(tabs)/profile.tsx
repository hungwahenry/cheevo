import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs, ProfileTabType } from '@/components/profile/ProfileTabs';
import { UserCommentsList } from '@/components/profile/UserCommentsList';
import { UserLikesList } from '@/components/profile/UserLikesList';
import { UserPostsList } from '@/components/profile/UserPostsList';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/src/hooks/useAuth';
import { useCurrentUserProfile } from '@/src/hooks/useProfile';
import { useCommentsModal } from '@/src/providers/CommentsProvider';
import React, { useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const { userProfile } = useAuth();
  const { profile, isLoading: isProfileLoading, error: profileError, refresh: refreshProfile } = useCurrentUserProfile();
  const { showComments } = useCommentsModal();
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
      await refreshProfile();
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
    if (!profile) return null;
    
    switch (activeTab) {
      case 'posts':
        return <UserPostsList key={`posts-${refreshKey}`} userId={profile.id} onComment={showComments} />;
      case 'comments':
        return <UserCommentsList key={`comments-${refreshKey}`} userId={profile.id} />;
      case 'likes':
        return <UserLikesList key={`likes-${refreshKey}`} userId={profile.id} onComment={showComments} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text variant="title" style={styles.headerTitle}>Profile</Text>
      </View>
      
      {isProfileLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
          <Text style={[styles.loadingText, { color: mutedColor }]}>Loading profile...</Text>
        </View>
      ) : profileError ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.errorText, { color: '#ef4444' }]}>Failed to load profile</Text>
          <Text style={[styles.errorDetails, { color: mutedColor }]}>{profileError}</Text>
        </View>
      ) : profile ? (
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          postsCount={profile.postsCount || 0}
          commentsCount={profile.commentsCount || 0}
          likesCount={profile.reactionsReceived || 0}
          headerComponent={
            <ProfileHeader
              profile={profile}
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
      ) : null}
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
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,

  },
});