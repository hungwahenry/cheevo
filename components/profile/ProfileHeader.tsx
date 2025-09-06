import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBlockUser } from '@/src/hooks/useBlockUser';
import { useProfileEdit } from '@/src/hooks/useProfileEdit';
import { UserProfile } from '@/src/types/user';
import { Camera, Check, Edit3, MapPin, UserCheck, UserX, X } from 'lucide-react-native';
import React from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { StatsRow } from './StatsRow';
import { UserAvatar } from './UserAvatar';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile?: boolean;
  onEditPress?: () => void;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
}

export function ProfileHeader({ profile, isOwnProfile = false, onEditPress, onProfileUpdate }: ProfileHeaderProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'foreground');
  
  const {
    isEditing,
    isLoading,
    error,
    bioText,
    selectedImageUri,
    startEditing,
    cancelEditing,
    setBioText,
    pickImage,
    saveProfile,
    clearError,
  } = useProfileEdit(profile);

  const { isBlocked: hookIsBlocked, isLoading: isBlockLoading, toggleBlock } = useBlockUser();
  
  // Use block status from profile if available, otherwise fall back to hook state
  const isBlocked = profile.isBlocked !== undefined ? profile.isBlocked : hookIsBlocked;

  const handleEditPress = () => {
    if (onEditPress) {
      onEditPress();
    }
    startEditing();
  };

  const handleSave = async () => {
    const updatedProfile = await saveProfile();
    if (updatedProfile && onProfileUpdate) {
      onProfileUpdate(updatedProfile);
    }
  };

  // No need to check block status separately - it comes with the profile

  const handleToggleBlock = () => {
    const action = isBlocked ? 'Unblock' : 'Block';
    const actionLower = action.toLowerCase();
    const message = isBlocked 
      ? `Are you sure you want to unblock @${profile.username}? They will be able to see your profile and interact with your posts again.`
      : `Are you sure you want to block @${profile.username}? They won't be able to see your profile or interact with your posts.`;

    Alert.alert(
      `${action} User`,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            const success = await toggleBlock(profile.id, profile.username, isBlocked);
            if (success) {
              const resultAction = isBlocked ? 'unblocked' : 'blocked';
              Alert.alert(
                `User ${resultAction.charAt(0).toUpperCase() + resultAction.slice(1)}`, 
                `@${profile.username} has been ${resultAction} successfully.`
              );
            } else {
              Alert.alert('Error', `Failed to ${actionLower} user. Please try again.`);
            }
          }
        }
      ]
    );
  };


  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.topSection}>
        {/* Avatar - clean and simple */}
        {isEditing ? (
          <TouchableOpacity 
            onPress={pickImage}
            style={[styles.editableAvatar, { borderColor }]}
            disabled={isLoading}
          >
            <UserAvatar 
              avatarUrl={selectedImageUri || profile.avatarUrl}
              username={profile.username}
              size={80}
            />
            <View style={[styles.cameraIcon, { backgroundColor, borderColor }]}>
              <Camera size={20} color={mutedColor} />
            </View>
          </TouchableOpacity>
        ) : (
          <UserAvatar 
            avatarUrl={profile.avatarUrl}
            username={profile.username}
            size={80}
          />
        )}
        
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <View style={styles.nameWithTrending}>
              <Text variant="heading" style={styles.username}>
                @{String(profile.username || 'Unknown')}
              </Text>
              {profile.trendingScore && Number(profile.trendingScore) > 0 && (
                <View style={[styles.trendingPill, { backgroundColor: useThemeColor({}, 'primary') }]}>
                  <Text style={styles.trendingText}>
                    🔥 {Number(profile.trendingScore) >= 1000 
                      ? `${(Number(profile.trendingScore) / 1000).toFixed(1)}K` 
                      : Number(profile.trendingScore)}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Edit/Save/Cancel buttons for own profile */}
            {isOwnProfile && (
              <View style={styles.actionButtons}>
                {!isEditing ? (
                  <Button 
                    variant="outline"
                    size="sm"
                    icon={Edit3}
                    onPress={handleEditPress}
                    style={styles.editButton}
                  />
                ) : (
                  <>
                    <Button 
                      variant="outline"
                      size="sm"
                      icon={X}
                      onPress={cancelEditing}
                      style={[styles.actionButton, { marginRight: 8 }]}
                      disabled={isLoading}
                    />
                    <Button 
                      variant="default"
                      size="sm"
                      icon={Check}
                      onPress={handleSave}
                      style={styles.actionButton}
                      disabled={isLoading}
                    />
                  </>
                )}
              </View>
            )}

            {/* Block/Unblock button for other users */}
            {!isOwnProfile && (
              <View style={styles.actionButtons}>
                <Button 
                  variant="outline"
                  size="sm"
                  icon={isBlocked ? UserCheck : UserX}
                  onPress={handleToggleBlock}
                  style={[
                    styles.editButton, 
                    isBlocked ? styles.unblockButton : styles.blockButton
                  ]}
                  disabled={isBlockLoading}
                />
              </View>
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

      {/* Bio section - editable when in edit mode */}
      {isEditing ? (
        <View style={styles.bioEditContainer}>
          <TextInput
            style={[
              styles.bioInput,
              { 
                borderColor: error ? useThemeColor({}, 'red') : borderColor,
                color: textColor,
              }
            ]}
            value={bioText}
            onChangeText={setBioText}
            placeholder="Write something about yourself..."
            placeholderTextColor={mutedColor}
            multiline
            maxLength={160}
            textAlignVertical="top"
          />
          <View style={styles.bioMeta}>
            <Text style={[styles.characterCount, { color: mutedColor }]}>
              {bioText.length}/160
            </Text>
          </View>
          {error && (
            <Text style={[styles.errorText, { color: useThemeColor({}, 'red') }]}>
              {error}
            </Text>
          )}
        </View>
      ) : (
        (profile.bio || bioText) && (
          <Text style={[styles.bio, { color: mutedColor }]}>
            {profile.bio || bioText}
          </Text>
        )
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
  blockButton: {
    borderColor: '#ef4444',
  },
  unblockButton: {
    borderColor: '#22c55e',
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
  editableAvatar: {
    position: 'relative',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 42,
    padding: 2,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 26,
    minWidth: 26,
  },
  bioEditContainer: {
    gap: 8,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    lineHeight: 16,
    minHeight: 60,
    maxHeight: 80,
  },
  bioMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  characterCount: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});