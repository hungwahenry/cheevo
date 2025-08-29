import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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

export default function UserProfileScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const { userId } = useLocalSearchParams<{ userId: string }>();
  
  const profileHook = useProfile(userId as string);
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');


  const renderTabContent = () => {
    if (!userId) return null;
    
    switch (activeTab) {
      case 'posts':
        return <UserPostsList userId={userId} />;
      case 'comments':
        return <UserCommentsList userId={userId} />;
      case 'likes':
        return <UserLikesList userId={userId} />;
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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ProfileHeader
              profile={profileHook.profile}
              isOwnProfile={false}
            />
          </ScrollView>

          <ProfileTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            postsCount={profileHook.stats.postsCount}
            commentsCount={profileHook.stats.commentsCount}
            likesCount={profileHook.stats.likesCount}
          >
            {renderTabContent()}
          </ProfileTabs>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    flexGrow: 0,
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