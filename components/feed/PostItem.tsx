import React, { useEffect } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { useThemeColor } from '@/hooks/useThemeColor';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { FeedPost } from '@/src/services/feed.service';
import { useAuth } from '@/src/hooks/useAuth';
import { router } from 'expo-router';

interface PostItemProps {
  post: FeedPost;
  showUniversity?: boolean; // For explore page to show university context
  onReaction?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onView?: () => void;
}

export function PostItem({ post, showUniversity = false, onReaction, onComment, onView }: PostItemProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const { userProfile } = useAuth();

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

  const handleReactionPress = () => {
    onReaction?.(post.id);
  };

  const handleCommentPress = () => {
    onComment?.(post.id);
  };

  const isLiked = post.user_reaction !== null;

  return (
    <Card style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity onPress={handleUserPress} style={styles.userInfo}>
          <UserAvatar
            avatarUrl={post.user_profiles?.avatar_url}
            username={post.user_profiles?.username}
            size={40}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>
              @{post.user_profiles?.username || 'Unknown'}
            </Text>
            {showUniversity && post.universities && (
              <Text style={[styles.universityText, { color: mutedColor }]}>
                {post.universities.short_name || post.universities.name}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.postMeta}>
          {post.is_trending && (
            <View style={[styles.trendingBadge, { backgroundColor: primaryColor }]}>
              <Text style={styles.trendingText}>🔥</Text>
            </View>
          )}
          <Text style={[styles.timeText, { color: mutedColor }]}>
            {formatDate(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* GIF if present */}
      {post.giphy_url && (
        <Image
          source={{ uri: post.giphy_url }}
          style={styles.gifImage}
          resizeMode="cover"
        />
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity 
          onPress={handleReactionPress}
          style={styles.actionButton}
        >
          <Text style={[styles.emojiIcon, isLiked && { opacity: 1 }]}>🔥</Text>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  postCard: {
    padding: 16,
    gap: 12,
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
    gap: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  universityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  trendingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendingText: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 12,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  gifImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 4,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emojiIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});