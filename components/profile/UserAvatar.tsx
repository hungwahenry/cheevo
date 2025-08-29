import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ViewStyle } from 'react-native';

interface UserAvatarProps {
  avatarUrl?: string | null;
  username?: string;
  size?: number;
  style?: ViewStyle;
}

export function UserAvatar({ avatarUrl, username, size = 40, style }: UserAvatarProps) {
  // Generate fallback initials from username
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <Avatar size={size} style={style}>
      {avatarUrl ? (
        <AvatarImage 
          source={{ uri: avatarUrl }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <AvatarFallback>
          {getInitials(username)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}