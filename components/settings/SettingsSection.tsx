import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { StyleSheet } from 'react-native';

interface SettingsSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, subtitle, children }: SettingsSectionProps) {
  const mutedColor = useThemeColor({}, 'mutedForeground');

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: mutedColor }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: mutedColor }]}>{subtitle}</Text>
          )}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    // Children will handle their own spacing
  },
});