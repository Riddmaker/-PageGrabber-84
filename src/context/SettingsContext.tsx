import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useDatabase } from './DatabaseContext';
import { getSetting, saveSetting } from '../database';
import {
  SupportedLanguage,
  DateFormat,
  AppStrings,
  translations,
  getDeviceLanguage,
  getDeviceDateFormat,
} from '../i18n';

interface SettingsContextType {
  language: SupportedLanguage;
  dateFormat: DateFormat;
  hideOcrHint: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  setDateFormat: (fmt: DateFormat) => void;
  setHideOcrHint: (val: boolean) => void;
  t: (key: keyof AppStrings) => string;
  formatDate: (timestamp: number) => string;
}

const SettingsContext = createContext<SettingsContextType>({
  language: 'en',
  dateFormat: 'dd/mm/yyyy',
  hideOcrHint: false,
  setLanguage: () => {},
  setDateFormat: () => {},
  setHideOcrHint: () => {},
  t: (key) => String(key),
  formatDate: (ts) => new Date(ts).toLocaleDateString(),
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { db } = useDatabase();

  // Initialize immediately from device — no loading flash
  const [language, setLanguageState] = useState<SupportedLanguage>(getDeviceLanguage);
  const [dateFormat, setDateFormatState] = useState<DateFormat>(getDeviceDateFormat);
  const [hideOcrHint, setHideOcrHintState] = useState(false);

  // Hydrate from persisted settings once DB is ready
  useEffect(() => {
    if (!db) return;
    (async () => {
      const savedLang = await getSetting(db, 'language');
      const savedFmt = await getSetting(db, 'dateFormat');
      const savedHideHint = await getSetting(db, 'hideOcrHint');
      if (savedLang && (translations as Record<string, AppStrings>)[savedLang]) {
        setLanguageState(savedLang as SupportedLanguage);
      }
      if (savedFmt === 'dd/mm/yyyy' || savedFmt === 'mm/dd/yyyy') {
        setDateFormatState(savedFmt);
      }
      if (savedHideHint === 'true') {
        setHideOcrHintState(true);
      }
    })().catch(console.error);
  }, [db]);

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setLanguageState(lang);
      if (db) saveSetting(db, 'language', lang).catch(console.error);
    },
    [db]
  );

  const setDateFormat = useCallback(
    (fmt: DateFormat) => {
      setDateFormatState(fmt);
      if (db) saveSetting(db, 'dateFormat', fmt).catch(console.error);
    },
    [db]
  );

  const setHideOcrHint = useCallback(
    (val: boolean) => {
      setHideOcrHintState(val);
      if (db) saveSetting(db, 'hideOcrHint', String(val)).catch(console.error);
    },
    [db]
  );

  const t = useCallback(
    (key: keyof AppStrings): string =>
      translations[language]?.[key] ?? translations.en[key] ?? String(key),
    [language]
  );

  const formatDate = useCallback(
    (timestamp: number): string => {
      const d = new Date(timestamp);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear());
      return dateFormat === 'mm/dd/yyyy'
        ? `${month}/${day}/${year}`
        : `${day}/${month}/${year}`;
    },
    [dateFormat]
  );

  return (
    <SettingsContext.Provider value={{ language, dateFormat, hideOcrHint, setLanguage, setDateFormat, setHideOcrHint, t, formatDate }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
