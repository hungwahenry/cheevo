import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/useThemeColor';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

interface SettingsHeaderProps {
  title: string;
  rightComponent?: React.ReactNode;
}

export function SettingsHeader({ title, rightComponent }: SettingsHeaderProps) {
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'foreground');
  const borderColor = useThemeColor({}, 'border');

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[
      styles.header, 
      { paddingTop: insets.top, borderBottomColor: borderColor }
    ]}>
      <TouchableOpacity 
        onPress={handleBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ArrowLeft size={24} color={textColor} />
      </TouchableOpacity>
      
      <Text variant="title" style={styles.headerTitle}>{title}</Text>
      
      <View style={styles.rightContainer}>
        {rightComponent || <View style={styles.headerSpacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: -32, // Offset back button to center title
  },
  rightContainer: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
  headerSpacer: {
    width: 32,
  },
});