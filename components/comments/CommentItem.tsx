import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/useThemeColor';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { Comment } from '@/src/services/comment.service';
import { useAuth } from '@/src/hooks/useAuth';
import { useDeleteComment } from '@/src/hooks/useDeleteComment';
import { Reply, MoreVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';

interface CommentItemProps {
  comment: Comment;
  replies?: Comment[]; // Replies to this comment
  replyCount?: number; // Total reply count
  isReply?: boolean; // Is this a reply itself?
  onRefresh: () => void;
  onReplyPress: (commentId: number, username: string) => void;
}

export function CommentItem({ 
  comment,
  replies = [],
  replyCount = 0,
  isReply = false, 
  onRefresh, 
  onReplyPress
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const textColor = useThemeColor({}, 'foreground');
  const backgroundColor = useThemeColor({}, 'card');
  
  const { userProfile } = useAuth();
  const { deleteComment, isDeleting } = useDeleteComment();

  const isOwner = userProfile?.id === comment.user_id;
  const hasReplies = replyCount > 0;
  const INITIAL_REPLIES_COUNT = 3;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'now';
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const handleReply = () => {
    onReplyPress(comment.id, comment.user_profiles.username);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteComment(comment.id);
            if (result.success) {
              onRefresh();
            } else {
              Alert.alert('Error', result.message);
            }
          },
        },
      ]
    );
    setShowMenu(false);
  };

  const toggleReplies = () => {
    setRepliesExpanded(!repliesExpanded);
  };

  const toggleShowAllReplies = () => {
    setShowAllReplies(!showAllReplies);
  };

  const displayedReplies = showAllReplies 
    ? replies 
    : replies.slice(0, INITIAL_REPLIES_COUNT);

  const hiddenRepliesCount = Math.max(0, replies.length - INITIAL_REPLIES_COUNT);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <UserAvatar 
          avatarUrl={comment.user_profiles.avatar_url}
          username={comment.user_profiles.username}
          size={isReply ? 28 : 32}
        />
        
        <View style={styles.headerContent}>
          <Text style={styles.username}>
            {comment.user_profiles.username}
          </Text>
          <Text style={[styles.timestamp, { color: mutedColor }]}>
            {formatDate(comment.created_at)}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <MoreVertical size={16} color={mutedColor} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { marginLeft: isReply ? 36 : 42 }]}>
        <Text style={[styles.text, { color: textColor }]}>
          {comment.content}
        </Text>
        
        <View style={styles.actions}>
          {/* All comments can be replied to */}
          <Button variant="ghost" size="sm" onPress={handleReply}>
            <Reply size={14} color={mutedColor} />
            <Text style={[styles.actionText, { color: mutedColor }]}>Reply</Text>
          </Button>
          
          {/* Only top-level comments show view replies button */}
          {hasReplies && !isReply && (
            <Button variant="ghost" size="sm" onPress={toggleReplies}>
              {repliesExpanded ? (
                <ChevronUp size={14} color={mutedColor} />
              ) : (
                <ChevronDown size={14} color={mutedColor} />
              )}
              <Text style={[styles.actionText, { color: mutedColor }]}>
                {repliesExpanded ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            </Button>
          )}
        </View>
      </View>

      {/* Menu */}
      {showMenu && (
        <View style={[styles.menu, { backgroundColor }]}>
          {isOwner && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Replies */}
      {repliesExpanded && hasReplies && !isReply && (
        <View style={styles.repliesContainer}>
          {displayedReplies.map((reply) => (
            <View key={reply.id} style={styles.replyItem}>
              <CommentItem 
                comment={reply} 
                isReply 
                onRefresh={onRefresh}
                onReplyPress={onReplyPress}
              />
            </View>
          ))}
          
          {/* Show More/Less Replies Button */}
          {hiddenRepliesCount > 0 && (
            <View style={styles.showMoreContainer}>
              <Button variant="ghost" size="sm" onPress={toggleShowAllReplies}>
                <Text style={[styles.showMoreText, { color: mutedColor }]}>
                  {showAllReplies 
                    ? 'Show less' 
                    : `Show ${hiddenRepliesCount} more ${hiddenRepliesCount === 1 ? 'reply' : 'replies'}`
                  }
                </Text>
              </Button>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 10,
    minHeight: 0,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 1,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 1,
  },
  menuButton: {
    padding: 4,
    marginTop: -2,
  },
  content: {
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  menu: {
    position: 'absolute',
    top: 32,
    right: 12,
    borderRadius: 6,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 13,
    color: '#ef4444',
  },
  repliesContainer: {
    marginLeft: 32,
    marginTop: 4,
  },
  replyItem: {
    marginTop: 4,
  },
  showMoreContainer: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  showMoreText: {
    fontSize: 11,
    fontWeight: '500',
  },
});