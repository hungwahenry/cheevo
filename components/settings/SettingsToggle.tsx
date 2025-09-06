import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { StyleSheet, Switch } from 'react-native';
import { LucideProps } from 'lucide-react-native';

interface SettingsToggleProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<LucideProps>;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggle({ 
  title, 
  subtitle, 
  icon, 
  value, 
  onValueChange,
  disabled = false 
}: SettingsToggleProps) {
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'foreground');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const primaryColor = useThemeColor({}, 'primary');
  const IconComponent = icon;

  return (
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
      
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ 
          false: mutedColor + '40', 
          true: primaryColor + '80' 
        }}
        thumbColor={value ? primaryColor : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 2,
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