import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { Feather } from '@expo/vector-icons';
import { colors, font } from '../theme';
import { useDatabase } from '../context/DatabaseContext';
import { useSettings } from '../context/SettingsContext';
import { getBook } from '../database/books';
import { getHighlightsByBook, deleteHighlight } from '../database/highlights';
import { exportBook } from '../utils/export';
import { Book, Highlight, RootStackParamList } from '../types';
import ScanlineOverlay from '../components/ScanlineOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export default function BookDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props['route']>();
  const { bookId, bookTitle } = route.params;
  const { db } = useDatabase();
  const { t, formatDate } = useSettings();

  const [book, setBook] = useState<Book | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!db) return;
      setLoading(true);
      Promise.all([getBook(db, bookId), getHighlightsByBook(db, bookId)])
        .then(([b, h]) => {
          setBook(b);
          setHighlights(h);
        })
        .finally(() => setLoading(false));
    }, [db, bookId])
  );

  const handleDeleteHighlight = useCallback(
    (id: string) => {
      Alert.alert(t('removeHighlight'), undefined, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            try {
              await deleteHighlight(db, id);
              setHighlights((prev) => prev.filter((h) => h.id !== id));
            } catch {
              Alert.alert(t('error'), t('couldNotRemove'));
            }
          },
        },
      ]);
    },
    [db, t]
  );

  const handleExport = useCallback(async () => {
    if (!book) return;
    setExporting(true);
    try {
      await exportBook(book, highlights);
    } catch (e) {
      Alert.alert(t('exportFailed'), String(e));
    } finally {
      setExporting(false);
    }
  }, [book, highlights, t]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookTitle}
        </Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.yellow} />
          ) : (
            <Text style={styles.exportText}>{t('export')}</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {book ? (
        <View style={styles.meta}>
          {book.author ? (
            <Text style={styles.author}>{t('byAuthor')} {book.author}</Text>
          ) : null}
          <Text style={styles.count}>
            {highlights.length}{' '}
            {highlights.length === 1 ? t('highlightSingular') : t('highlightPlural')}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : (
        <FlatList
          data={highlights}
          keyExtractor={(h) => h.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.pageSnippet}>
                <Text style={styles.snippetText}>{item.extracted_text}</Text>
              </View>
              {item.user_note ? (
                <View style={styles.noteBlock}>
                  <Text style={styles.noteText}>// {item.user_note}</Text>
                </View>
              ) : null}
              <View style={styles.cardFooter}>
                <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteHighlight(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBracket}>[</Text>
                  <Feather name="trash-2" size={14} color={colors.maroon} />
                  <Text style={styles.deleteBracket}>]</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {t('noHighlightsYet')}{'\n'}{t('goBackCapture')}
              </Text>
              <Text style={styles.emptyCursor}>█</Text>
            </View>
          }
        />
      )}

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
    color: colors.text,
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  exportBtn: { paddingHorizontal: 8, paddingVertical: 10, minWidth: 60, alignItems: 'flex-end' },
  exportText: {
    fontFamily: font.mono,
    color: colors.yellow,
    fontSize: 10,
    letterSpacing: 1,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.surface0,
  },
  author: {
    fontFamily: font.mono,
    color: colors.subtext0,
    fontSize: 11,
  },
  count: {
    fontFamily: font.mono,
    color: colors.overlay0,
    fontSize: 11,
    letterSpacing: 1,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 8 },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.surface1,
    overflow: 'hidden',
  },
  pageSnippet: {
    backgroundColor: '#F4EDD3',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderLeftWidth: 3,
    borderLeftColor: colors.yellow,
  },
  snippetText: {
    fontFamily: font.book,
    fontSize: 16,
    lineHeight: 26,
    color: '#2D1F0E',
  },
  noteBlock: {
    backgroundColor: colors.surface0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.surface1,
  },
  noteText: {
    fontFamily: font.mono,
    color: colors.yellow,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cardFooter: {
    backgroundColor: colors.mantle,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: colors.surface1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBracket: {
    fontFamily: font.mono,
    color: colors.maroon,
    fontSize: 14,
  },
  timestamp: {
    fontFamily: font.mono,
    color: colors.overlay0,
    fontSize: 10,
    letterSpacing: 1,
  },
  empty: { padding: 32, gap: 8 },
  emptyText: {
    fontFamily: font.mono,
    color: colors.overlay0,
    fontSize: 13,
    lineHeight: 22,
  },
  emptyCursor: {
    fontFamily: font.mono,
    color: colors.green,
    fontSize: 13,
    marginTop: 8,
  },
});
