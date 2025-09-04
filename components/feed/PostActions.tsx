import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ActionSheet, ActionSheetOption } from '@/components/ui/action-sheet';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/src/hooks/useAuth';
import * as Haptics from 'expo-haptics';

interface PostActionsProps {
  postId: number;
  postUserId: string;
  onDelete?: (postId: number) => void;
  onReport?: (postId: number) => void;
}

export function PostActions({ 
  postId, 
  postUserId, 
  onDelete, 
  onReport 
}: PostActionsProps) {
  const { userProfile } = useAuth();
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const [isVisible, setIsVisible] = useState(false);

  const isOwnPost = userProfile?.id === postUserId;

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete?.(postId);
    setIsVisible(false);
  };

  const handleReport = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReport?.(postId);
    setIsVisible(false);
  };

  const showActionSheet = () => {
    setIsVisible(true);
  };

  const options: ActionSheetOption[] = isOwnPost 
    ? [
        {
          title: 'Delete Post',
          onPress: handleDelete,
          destructive: true,
        },
      ]
    : [
        {
          title: 'Report Post',
          onPress: handleReport,
          destructive: true,
        },
      ];

  return (
    <>
      <TouchableOpacity 
        style={styles.trigger}
        onPress={showActionSheet}
        activeOpacity={0.7}
      >
        <Text style={[styles.dotsIcon, { color: mutedColor }]}>
          ⋯
        </Text>
      </TouchableOpacity>

      <ActionSheet
        visible={isVisible}
        onClose={() => setIsVisible(false)}
        options={options}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 8,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
});