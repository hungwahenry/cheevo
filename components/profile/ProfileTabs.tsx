import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FileText, Heart, MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';

export type ProfileTabType = 'posts' | 'comments' | 'likes';

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
  postsCount?: number;
  commentsCount?: number;
  likesCount?: number;
  headerComponent?: React.ReactNode;
  refreshControl?: React.ReactElement<any>;
  children: React.ReactNode;
}

export function ProfileTabs({ 
  activeTab, 
  onTabChange, 
  postsCount = 0,
  commentsCount = 0,
  likesCount = 0,
  headerComponent,
  refreshControl,
  children 
}: ProfileTabsProps) {
  const primaryColor = useThemeColor({}, 'primary');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');

  const tabs = [
    {
      id: 'posts' as ProfileTabType,
      label: 'Posts',
      icon: FileText,
      count: postsCount,
    },
    {
      id: 'comments' as ProfileTabType,
      label: 'Comments',
      icon: MessageCircle,
      count: commentsCount,
    },
    {
      id: 'likes' as ProfileTabType,
      label: 'Liked',
      icon: Heart,
      count: likesCount,
    },
  ];

  const TabButton = ({ tab }: { tab: typeof tabs[0] }) => {
    const isActive = activeTab === tab.id;
    const Icon = tab.icon;
    
    return (
      <Pressable
        style={[
          styles.tabButton,
          isActive && { borderBottomColor: primaryColor },
        ]}
        onPress={() => onTabChange(tab.id)}
      >
        <View style={styles.tabContent}>
          <Icon 
            size={16} 
            color={isActive ? primaryColor : mutedColor}
          />
          <Text 
            style={[
              styles.tabLabel,
              { color: isActive ? primaryColor : mutedColor }
            ]}
          >
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <Text 
              style={[
                styles.tabCount,
                { color: isActive ? primaryColor : mutedColor }
              ]}
            >
              ({tab.count})
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  const TabBar = () => (
    <View style={[styles.tabsContainer, { borderBottomColor: borderColor, backgroundColor }]}>
      {tabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={headerComponent ? [1] : [0]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={refreshControl}
      >
        {headerComponent}
        <TabBar />
        <View style={styles.contentContainer}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    minHeight: 500,
  },
});