import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';
import { useSettings } from '../context/SettingsContext';

interface Props {
  onDismissSession: () => void;
  onDismissForever: () => void;
}

export default function OcrHintBanner({ onDismissSession, onDismissForever }: Props) {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();
  // Position just below the top bar: safe area inset + row height (44) + paddingBottom (10) + gap (10)
  const top = insets.top + 64;

  return (
    <View style={[styles.banner, { top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onDismissSession}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeBtn}>[ x ]</Text>
        </TouchableOpacity>
        <Text style={styles.title}>// SCAN TIP</Text>
      </View>
      <Text style={styles.body}>{t('ocrHintText')}</Text>
      <TouchableOpacity onPress={onDismissForever} activeOpacity={0.7} style={styles.hideBtn}>
        <Text style={styles.hideBtnText}>[ {t('ocrHintHideForever')} ]</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.mantle,
    borderWidth: 1,
    borderColor: colors.surface1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    fontFamily: font.mono,
    color: colors.overlay1,
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    fontFamily: font.mono,
    color: colors.green,
    fontSize: 10,
    letterSpacing: 2,
  },
  body: {
    fontFamily: font.mono,
    color: colors.subtext0,
    fontSize: 12,
    lineHeight: 19,
    letterSpacing: 0.3,
  },
  hideBtn: {
    alignSelf: 'flex-start',
  },
  hideBtnText: {
    fontFamily: font.mono,
    color: colors.overlay0,
    fontSize: 10,
    letterSpacing: 1,
  },
});
