const lightColors = {
  // Base colors
  background: '#FFFFFF',
  foreground: '#000000',

  // Card colors
  card: '#F2F2F7',
  cardForeground: '#000000',

  // Popover colors
  popover: '#F2F2F7',
  popoverForeground: '#000000',

  // Primary colors
  primary: '#4e8af1',
  primaryForeground: '#FFFFFF',

  // Secondary colors
  secondary: '#e34d8e',
  secondaryForeground: '#FFFFFF',

  // Muted colors
  muted: '#78788033',
  mutedForeground: '#71717a',

  // Accent colors
  accent: '#f6ae2d',
  accentForeground: '#18181b',

  // Destructive colors
  destructive: '#f26419',
  destructiveForeground: '#FFFFFF',

  // Border and input
  border: '#C6C6C8',
  input: '#e4e4e7',
  ring: '#a1a1aa',

  // Text colors
  text: '#000000',
  textMuted: '#71717a',

  // Legacy support for existing components
  tint: '#4e8af1',
  icon: '#71717a',
  tabIconDefault: '#71717a',
  tabIconSelected: '#4e8af1',

  // Default buttons, links, Send button, selected tabs
  blue: '#4e8af1',

  // Success states, FaceTime buttons, completed tasks
  green: '#048b4b',

  // Delete buttons, error states, critical alerts
  red: '#f26419',

  // VoiceOver highlights, warning states
  orange: '#f26419',

  // Notes app accent, Reminders highlights
  yellow: '#f6ae2d',

  // Pink accent color for various UI elements
  pink: '#e34d8e',

  // Purple accent for creative apps and features
  purple: '#e34d8e',

  // Teal accent for communication features
  teal: '#4e8af1',

  // Indigo accent for system features
  indigo: '#4e8af1',
};

const darkColors = {
  // Base colors
  background: '#000000',
  foreground: '#FFFFFF',

  // Card colors
  card: '#1C1C1E',
  cardForeground: '#FFFFFF',

  // Popover colors
  popover: '#18181b',
  popoverForeground: '#FFFFFF',

  // Primary colors
  primary: '#4e8af1',
  primaryForeground: '#FFFFFF',

  // Secondary colors
  secondary: '#e34d8e',
  secondaryForeground: '#FFFFFF',

  // Muted colors
  muted: '#78788033',
  mutedForeground: '#a1a1aa',

  // Accent colors
  accent: '#f6ae2d',
  accentForeground: '#18181b',

  // Destructive colors
  destructive: '#f26419',
  destructiveForeground: '#FFFFFF',

  // Border and input - using alpha values for better blending
  border: '#38383A',
  input: 'rgba(255, 255, 255, 0.15)',
  ring: '#71717a',

  // Text colors
  text: '#FFFFFF',
  textMuted: '#a1a1aa',

  // Legacy support for existing components
  tint: '#4e8af1',
  icon: '#a1a1aa',
  tabIconDefault: '#a1a1aa',
  tabIconSelected: '#4e8af1',

  // Default buttons, links, Send button, selected tabs
  blue: '#4e8af1',

  // Success states, FaceTime buttons, completed tasks
  green: '#048b4b',

  // Delete buttons, error states, critical alerts
  red: '#f26419',

  // VoiceOver highlights, warning states
  orange: '#f26419',

  // Notes app accent, Reminders highlights
  yellow: '#f6ae2d',

  // Pink accent color for various UI elements
  pink: '#e34d8e',

  // Purple accent for creative apps and features
  purple: '#e34d8e',

  // Teal accent for communication features
  teal: '#4e8af1',

  // Indigo accent for system features
  indigo: '#4e8af1',
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

// Export individual color schemes for easier access
export { darkColors, lightColors };

// Utility type for color keys
export type ColorKeys = keyof typeof lightColors;
