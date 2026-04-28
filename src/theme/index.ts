import { Platform, StyleSheet } from 'react-native';

export const colors = {
  // Catppuccin Mocha
  crust: '#11111b',
  mantle: '#181825',
  base: '#1e1e2e',
  surface0: '#313244',
  surface1: '#45475a',
  surface2: '#585b70',
  overlay0: '#6c7086',
  overlay1: '#7f849c',
  subtext0: '#a6adc8',
  subtext1: '#bac2de',
  text: '#cdd6f4',
  lavender: '#b4befe',
  blue: '#89b4fa',
  sapphire: '#74c7ec',
  sky: '#89dceb',
  teal: '#94e2d5',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  peach: '#fab387',
  maroon: '#eba0ac',
  red: '#f38ba8',
  mauve: '#cba6f7',
  pink: '#f5c2e7',
  flamingo: '#f2cdcd',
  rosewater: '#f5e0dc',

  // Semantic
  highlightFill: 'rgba(249, 226, 175, 0.45)',
  highlightSelected: 'rgba(249, 226, 175, 0.30)',
  overlayDark: 'rgba(17, 17, 27, 0.75)',
  overlayMedium: 'rgba(17, 17, 27, 0.55)',
};

export const font = {
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

export const commonStyles = StyleSheet.create({
  flex1: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.base },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text,
  },
  dimBorder: {
    borderWidth: 1,
    borderColor: colors.surface1,
  },
  terminalBorder: {
    borderWidth: 1,
    borderColor: colors.green,
  },
  sectionHeader: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.green,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
