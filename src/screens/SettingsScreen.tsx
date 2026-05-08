import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

import { colors, font } from '../theme';
import { useSettings } from '../context/SettingsContext';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  SupportedLanguage,
  DateFormat,
} from '../i18n';
import ScanlineOverlay from '../components/ScanlineOverlay';

const GITHUB_REPO = 'https://github.com/Riddmaker/-PageGrabber-84';

function buildBugReportUrl(version: string): string {
  const body = [
    `App Version: ${version}`,
    '',
    'What happened?',
    '[Please describe the bug]',
    '',
    'Screenshots:',
    '[Please attach any screenshots here]',
  ].join('\n');
  return `${GITHUB_REPO}/issues/new?title=%5BBug%5D%20&body=${encodeURIComponent(body)}`;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { t, language, dateFormat, setLanguage, setDateFormat } = useSettings();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>// {t('settingsTitle')}</Text>
        <View style={styles.headerSpacer} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Language */}
        <Text style={styles.sectionHeader}>&gt; {t('language')}</Text>
        {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => (
          <TouchableOpacity
            key={lang}
            onPress={() => setLanguage(lang)}
            style={[styles.row, lang === language && styles.rowActive]}
            activeOpacity={0.7}
          >
            <Text style={styles.checkmark}>
              {lang === language ? '[ ✓ ]' : '[   ]'}
            </Text>
            <Text style={[styles.rowText, lang === language && styles.rowTextActive]}>
              {LANGUAGE_NAMES[lang]}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Date format */}
        <Text style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
          &gt; {t('dateFormat')}
        </Text>
        {(['dd/mm/yyyy', 'mm/dd/yyyy'] as DateFormat[]).map((fmt) => (
          <TouchableOpacity
            key={fmt}
            onPress={() => setDateFormat(fmt)}
            style={[styles.row, fmt === dateFormat && styles.rowActive]}
            activeOpacity={0.7}
          >
            <Text style={styles.checkmark}>
              {fmt === dateFormat ? '[ ✓ ]' : '[   ]'}
            </Text>
            <Text style={[styles.rowText, fmt === dateFormat && styles.rowTextActive]}>
              {fmt === 'dd/mm/yyyy' ? t('dateFormatDDMM') : t('dateFormatMMDD')}
            </Text>
          </TouchableOpacity>
        ))}

        {/* About */}
        <Text style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
          &gt; {t('about')}
        </Text>
        <View style={styles.row}>
          <Text style={styles.aboutLabel}>{t('appVersion')}</Text>
          <Text style={styles.aboutValue}>{version}</Text>
        </View>
        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL(buildBugReportUrl(version))}
          activeOpacity={0.7}
        >
          <Text style={styles.bugReportText}>[ {t('reportBug')} ]</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScanlineOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.surface1,
    backgroundColor: colors.mantle,
  },
  backBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  backText: {
    fontFamily: font.mono,
    color: colors.subtext0,
    fontSize: 13,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: font.mono,
    color: colors.green,
    fontSize: 12,
    letterSpacing: 3,
  },
  headerSpacer: { width: 80 },
  content: { paddingVertical: 12, paddingBottom: 40 },
  sectionHeader: {
    fontFamily: font.mono,
    color: colors.overlay0,
    fontSize: 10,
    letterSpacing: 2,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeaderSpaced: { marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.surface0,
    gap: 12,
  },
  rowActive: { backgroundColor: colors.surface0 },
  checkmark: {
    fontFamily: font.mono,
    color: colors.green,
    fontSize: 11,
    letterSpacing: 1,
    width: 44,
  },
  rowText: {
    fontFamily: font.mono,
    color: colors.subtext0,
    fontSize: 14,
  },
  rowTextActive: { color: colors.text },
  aboutLabel: {
    fontFamily: font.mono,
    color: colors.overlay1,
    fontSize: 11,
    letterSpacing: 1,
    flex: 1,
  },
  aboutValue: {
    fontFamily: font.mono,
    color: colors.green,
    fontSize: 13,
    letterSpacing: 1,
  },
  bugReportText: {
    fontFamily: font.mono,
    color: colors.mauve,
    fontSize: 12,
    letterSpacing: 1,
  },
});
