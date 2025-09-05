import React, { useState } from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ArrowLeft } from 'lucide-react-native';
import { useProfile } from '@/src/hooks/useProfile';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs, ProfileTabType } from '@/components/profile/ProfileTabs';
import { UserPostsList } from '@/components/profile/UserPostsList';
import { UserCommentsList } from '@/components/profile/UserCommentsList';
import { UserLikesList } from '@/components/profile/UserLikesList';
import { CommentsSheet } from '@/components/comments/CommentsSheet';

export default function UserProfileScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const { userId } = useLocalSearchParams<{ userId: string }>();
  
  const profileHook = useProfile(userId as string);
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

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

  const handleComment = (postId: number) => {
    setSelectedPostId(postId);
    setCommentsVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsVisible(false);
    setSelectedPostId(null);
  };


  const renderTabContent = () => {
    if (!userId) return null;
    
    switch (activeTab) {
      case 'posts':
        return <UserPostsList key={`posts-${refreshKey}`} userId={userId} onComment={handleComment} />;
      case 'comments':
        return <UserCommentsList key={`comments-${refreshKey}`} userId={userId} />;
      case 'likes':
        return <UserLikesList key={`likes-${refreshKey}`} userId={userId} onComment={handleComment} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: profileHook.profile?.username ? `@${profileHook.profile.username}` : 'User Profile',
          headerStyle: { backgroundColor },
          headerShadowVisible: false,
          headerLeft: () => (
            <Button 
              variant="ghost"
              size="icon"
              icon={ArrowLeft}
              onPress={() => router.back()}
              style={styles.backButton}
            />
          )
        }} 
      />
      
      {profileHook.isLoading ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: mutedColor }]}>
            Loading profile...
          </Text>
        </View>
      ) : profileHook.error ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: mutedColor }]}>
            {profileHook.error}
          </Text>
          <Button 
            variant="outline" 
            onPress={() => router.back()}
            style={styles.backToFeedButton}
          >
            Back to Feed
          </Button>
        </View>
      ) : profileHook.profile ? (
        <>
          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            postsCount={profileHook.profile.postsCount || 0}
            commentsCount={profileHook.profile.commentsCount || 0}
            likesCount={profileHook.profile.reactionsReceived || 0}
            headerComponent={
              <ProfileHeader
                profile={profileHook.profile}
                isOwnProfile={false}
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
        </>
      ) : null}
      
      {/* Comments Modal */}
      {selectedPostId && (
        <CommentsSheet
          isVisible={commentsVisible}
          onClose={handleCloseComments}
          postId={selectedPostId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    marginLeft: -8,
  },
  backToFeedButton: {
    marginTop: 8,
  },
});