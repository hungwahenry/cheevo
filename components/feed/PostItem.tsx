import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/useThemeColor';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { FeedPost } from '@/src/services/feed.service';
import { useAuth } from '@/src/hooks/useAuth';
import { router } from 'expo-router';
import { PostActions } from './PostActions';
import * as Haptics from 'expo-haptics';

interface PostItemProps {
  post: FeedPost;
  showUniversity?: boolean; // For explore page to show university context
  onReaction?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onView?: () => void;
  onDelete?: (postId: number) => void;
  onReport?: (postId: number) => void;
}

export function PostItem({ post, showUniversity = false, onReaction, onComment, onView, onDelete, onReport }: PostItemProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const { userProfile } = useAuth();
  const [imageError, setImageError] = useState(false);

  // Track post view when component mounts and becomes visible
  useEffect(() => {
    if (onView) {
      // Small delay to ensure the post is actually visible
      const timer = setTimeout(() => {
        onView();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [onView]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMins)}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleUserPress = () => {
    if (post.user_id === userProfile?.id) {
      // Navigate to own profile tab
      router.push('/(tabs)/profile');
    } else {
      // Navigate to other user's profile
      router.push(`/profile/${post.user_id}`);
    }
  };

  const handleReactionPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReaction?.(post.id);
  };

  const handleCommentPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComment?.(post.id);
  };

  const isLiked = post.user_reaction !== null;

  return (
    <Card style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity onPress={handleUserPress} style={styles.userInfo} activeOpacity={0.7}>
          <UserAvatar
            avatarUrl={post.user_profiles?.avatar_url}
            username={post.user_profiles?.username}
            size={44}
          />
          <View style={styles.userDetails}>
            <View style={styles.userRow}>
              <Text style={styles.username}>
                @{post.user_profiles?.username || 'Unknown'}
              </Text>
              <Text style={[styles.timeText, { color: mutedColor }]}>
                · {formatDate(post.created_at)}
              </Text>
            </View>
            {showUniversity && post.universities && (
              <Text style={[styles.universityText, { color: mutedColor }]}>
                {post.universities.short_name || post.universities.name}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <PostActions
          postId={post.id}
          postUserId={post.user_id}
          onDelete={onDelete}
          onReport={onReport}
        />
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* GIF if present */}
      {post.giphy_url && !imageError && (
        <Image
          source={{ uri: post.giphy_url }}
          style={styles.gifImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      )}
      
      {/* Show error state if GIF failed to load */}
      {post.giphy_url && imageError && (
        <View style={[styles.gifError, { borderColor }]}>
          <Text style={[styles.errorText, { color: mutedColor }]}>GIF unavailable</Text>
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <View style={styles.leftActions}>
          <TouchableOpacity 
            onPress={handleReactionPress}
            style={[styles.actionButton, isLiked && styles.actionButtonActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.emojiIcon, isLiked && styles.activeEmoji]}>🔥</Text>
            <Text style={[
              styles.actionText, 
              { color: isLiked ? primaryColor : mutedColor }
            ]}>
              {post.reactions_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleCommentPress}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiIcon}>💬</Text>
            <Text style={[styles.actionText, { color: mutedColor }]}>
              {post.comments_count || 0}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButton}>
            <Text style={styles.emojiIcon}>👀</Text>
            <Text style={[styles.actionText, { color: mutedColor }]}>
              {post.views_count || 0}
            </Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          {post.is_trending && (
            <View style={[styles.trendingBadge, { backgroundColor: `${primaryColor}15` }]}>
              <Text style={[styles.trendingText, { color: primaryColor }]}>🔥 Trending</Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  postCard: {
    padding: 16,
    gap: 14,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  universityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 2,
  },
  gifImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  gifError: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 18,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
  },
  emojiIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  activeEmoji: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  trendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingText: {
    fontSize: 11,
    fontWeight: '600',
  },
});