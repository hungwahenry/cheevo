import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { FeedAlgorithm } from '@/src/services/feed.service';

interface AlgorithmOption {
  value: FeedAlgorithm;
  label: string;
  emoji: string;
  description: string;
}

interface AlgorithmSelectorProps {
  selected: FeedAlgorithm;
  onSelect: (algorithm: FeedAlgorithm) => void;
  algorithms: FeedAlgorithm[];
}

export function AlgorithmSelector({ selected, onSelect, algorithms }: AlgorithmSelectorProps) {
  const primaryColor = useThemeColor({}, 'primary');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const backgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

  const algorithmOptions: AlgorithmOption[] = [
    {
      value: 'trending',
      label: 'Trending',
      emoji: '🔥',
      description: 'Hot posts right now'
    },
    {
      value: 'chronological',
      label: 'Recent',
      emoji: '🕒',
      description: 'Latest posts first'
    },
    {
      value: 'engagement',
      label: 'Popular',
      emoji: '⭐',
      description: 'Most liked & commented'
    },
    {
      value: 'balanced',
      label: 'Mixed',
      emoji: '🎯',
      description: 'Trending + recent'
    },
    {
      value: 'discovery',
      label: 'Discover',
      emoji: '🌟',
      description: 'Diverse content'
    }
  ];

  // Filter to only show available algorithms
  const availableOptions = algorithmOptions.filter(option => 
    algorithms.includes(option.value)
  );

  const AlgorithmChip = ({ option }: { option: AlgorithmOption }) => {
    const isSelected = selected === option.value;

    return (
      <TouchableOpacity
        onPress={() => onSelect(option.value)}
        style={[
          styles.chip,
          {
            backgroundColor: isSelected ? primaryColor : backgroundColor,
            borderColor: isSelected ? primaryColor : borderColor,
          }
        ]}
      >
        <Text style={styles.chipEmoji}>{option.emoji}</Text>
        <Text style={[
          styles.chipLabel,
          { color: isSelected ? 'white' : mutedColor }
        ]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {availableOptions.map((option) => (
          <AlgorithmChip key={option.value} option={option} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});