import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { StyleSheet } from 'react-native';

interface StatsRowProps {
  postsCount?: number | null;
  reactionsReceived?: number | null;
  commentsCount?: number | null;
  trendingScore?: number | null;
  totalViews?: number | null;
}

export function StatsRow({ 
  postsCount = 0, 
  reactionsReceived = 0, 
  commentsCount = 0, 
  trendingScore = 0,
  totalViews = 0 
}: StatsRowProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const StatItem = ({ label, value }: { label: string; value: number }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{formatNumber(value)}</Text>
      <Text style={[styles.statLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatItem label="Posts" value={postsCount || 0} />
      <StatItem label="Likes" value={reactionsReceived || 0} />
      <StatItem label="Comments" value={commentsCount || 0} />
      <StatItem label="Views" value={totalViews || 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});