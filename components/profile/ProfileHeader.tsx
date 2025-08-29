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
            <Text variant="heading" style={styles.username}>
              @{profile.username || 'Unknown'}
            </Text>
            {isOwnProfile && (
              <Button 
                variant="outline"
                size="sm"
                icon={Edit3}
                onPress={onEditPress}
                style={styles.editButton}
                label="Edit"
              />
            )}
          </View>
          
          {profile.university && profile.university.name && (
            <View style={styles.universityRow}>
              <MapPin size={14} color={mutedColor} />
              <Text style={[styles.universityText, { color: mutedColor }]}>
                {profile.university.name}
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
        trendingScore={profile.trendingScore}
        totalViews={profile.totalViews}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
    gap: 16,
  },
  topSection: {
    flexDirection: 'row',
    gap: 16,
  },
  userInfo: {
    flex: 1,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
  },
  editButton: {
    paddingHorizontal: 12,
    height: 32,
  },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  universityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
});