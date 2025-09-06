import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { LucideProps, ChevronRight } from 'lucide-react-native';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<LucideProps>;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
}

export function SettingsItem({ 
  title, 
  subtitle, 
  icon, 
  onPress, 
  rightComponent,
  showChevron = true,
  disabled = false 
}: SettingsItemProps) {
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'foreground');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const IconComponent = icon;

  const content = (
    <View style={[
      styles.container, 
      { backgroundColor: cardColor },
      disabled && styles.disabled
    ]}>
      {IconComponent && (
        <View style={styles.iconContainer}>
          <IconComponent size={20} color={disabled ? mutedColor : textColor} />
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={[
          styles.title, 
          { color: disabled ? mutedColor : textColor }
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            {subtitle}
          </Text>
        )}
      </View>
      
      {rightComponent || (showChevron && onPress && (
        <ChevronRight size={16} color={mutedColor} />
      ))}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
});