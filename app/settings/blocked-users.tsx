import React, { useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Button } from '@/components/ui/button';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBlockedUsers } from '@/src/hooks/useBlockedUsers';
import { type BlockedUser } from '@/src/services/privacy.service';
import { UserCheck, Users } from 'lucide-react-native';

export default function BlockedUsersScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const borderColor = useThemeColor({}, 'border');
  
  const { blockedUsers, loading, error, refresh, unblockUser } = useBlockedUsers();
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingUsers, setUnblockingUsers] = useState<Set<string>>(new Set());

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleUnblockUser = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${user.blocked_user_info?.username || 'Unknown User'}? They will be able to see your profile and interact with your posts again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblockingUsers(prev => new Set(prev).add(user.blocked_user_id));
            
            try {
              const success = await unblockUser(user.blocked_user_id);
              
              if (success) {
                Alert.alert('Success', `@${user.blocked_user_info?.username || 'User'} has been unblocked.`);
              } else {
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
              }
            } finally {
              setUnblockingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(user.blocked_user_id);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };


  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Users size={48} color={mutedColor} style={styles.emptyIcon} />
      <Text variant="heading" style={styles.emptyTitle}>No Blocked Users</Text>
      <Text style={[styles.emptyText, { color: mutedColor }]}>
        You haven't blocked any users yet. Blocked users won't be able to see your profile or interact with your posts.
      </Text>
    </View>
  );

  const renderBlockedUser = (user: BlockedUser) => (
    <View key={user.id} style={[styles.userCard, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.userInfo}>
        <UserAvatar 
          avatarUrl={null} 
          username={user.blocked_user_info?.username || 'Unknown User'}
          size={40}
        />
        <View style={styles.userDetails}>
          <Text variant="heading" style={styles.username}>
            @{user.blocked_user_info?.username || 'Unknown User'}
          </Text>
          {user.blocked_user_info?.university_name && (
            <Text style={[styles.university, { color: mutedColor }]}>
              {user.blocked_user_info.university_name}
            </Text>
          )}
          <Text style={[styles.blockedDate, { color: mutedColor }]}>
            Blocked {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <Button
        variant="outline"
        size="sm"
        icon={UserCheck}
        onPress={() => handleUnblockUser(user)}
        disabled={unblockingUsers.has(user.blocked_user_id)}
        style={styles.unblockButton}
      >
        {unblockingUsers.has(user.blocked_user_id) ? 'Unblocking...' : 'Unblock'}
      </Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsHeader title="Blocked Users" />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={{ color: mutedColor }}>Loading blocked users...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={{ color: mutedColor }}>{error}</Text>
              <Button variant="outline" onPress={refresh} style={styles.retryButton}>
                Try Again
              </Button>
            </View>
          ) : blockedUsers.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <Text style={[styles.description, { color: mutedColor }]}>
                You have blocked {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''}. 
                Blocked users can't see your profile or interact with your posts.
              </Text>
              
              <View style={styles.usersList}>
                {blockedUsers.map(renderBlockedUser)}
              </View>
            </>
          )}
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userDetails: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  university: {
    fontSize: 13,
  },
  blockedDate: {
    fontSize: 12,
  },
  unblockButton: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});