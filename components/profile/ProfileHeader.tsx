import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { UserAvatar } from './UserAvatar';
import { StatsRow } from './StatsRow';
import { useThemeColor } from '@/hooks/useThemeColor';
import { StyleSheet } from 'react-native';
import { Edit3, MapPin } from 'lucide-react-native';
import { UserProfile } from '@/src/types/user';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
  onEditPress?: () => void;
}

export function ProfileHeader({ profile, isOwnProfile = false, onEditPress }: ProfileHeaderProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'card');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.topSection}>
        <UserAvatar 
          avatarUrl={profile.avatarUrl}
          username={profile.username}
          size={80}
        />
        
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <View style={styles.nameWithTrending}>
              <Text variant="heading" style={styles.username}>
                @{profile.username || 'Unknown'}
              </Text>
              {profile.trendingScore && profile.trendingScore > 0 && (
                <View style={[styles.trendingPill, { backgroundColor: useThemeColor({}, 'primary') }]}>
                  <Text style={styles.trendingText}>
                    🔥 {profile.trendingScore >= 1000 
                      ? `${(profile.trendingScore / 1000).toFixed(1)}K` 
                      : profile.trendingScore}
                  </Text>
                </View>
              )}
            </View>
            {isOwnProfile && (
              <Button 
                variant="outline"
                size="sm"
                icon={Edit3}
                onPress={onEditPress}
                style={styles.editButton}
              />
            )}
          </View>
          
          {profile.university && profile.university.name && (
            <View style={styles.universityRow}>
              <MapPin size={14} color={mutedColor} />
              <Text style={[styles.universityText, { color: mutedColor }]} numberOfLines={1}>
                {profile.university.shortName || profile.university.name}
                {profile.university.state && ` • ${profile.university.state}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {profile.bio && (
        <Text style={[styles.bio, { color: mutedColor }]}>
          {profile.bio}
        </Text>
      )}

      <StatsRow
        postsCount={profile.postsCount}
        reactionsReceived={profile.reactionsReceived}
        commentsCount={profile.commentsCount}
        trendingScore={0}
        totalViews={profile.totalViews}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  topSection: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameWithTrending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendingPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 26,
  },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  universityText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bio: {
    fontSize: 14,
    lineHeight: 18,
  },
});