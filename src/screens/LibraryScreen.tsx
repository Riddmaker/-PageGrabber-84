import React, { useCallback, useRef, useState } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather, FontAwesome } from '@expo/vector-icons';

import { colors, font } from '../theme';
import { useDatabase } from '../context/DatabaseContext';
import { useSettings } from '../context/SettingsContext';
import { useBook } from '../context/BookContext';
import { getAllBooks, deleteBook } from '../database/books';
import { getHighlightsByBook } from '../database/highlights';
import { bulkExport } from '../utils/export';
import { Book, RootStackParamList } from '../types';
import BookCard from '../components/BookCard';
import ScanlineOverlay from '../components/ScanlineOverlay';

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { db } = useDatabase();
  const { t } = useSettings();
  const { activeBook, setActiveBook } = useBook();

  const [books, setBooks] = useState<Book[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const swipeRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const loadBooks = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const all = await getAllBooks(db);
      setBooks(all);
      const c: Record<string, number> = {};
      await Promise.all(
        all.map(async (b) => {
          const h = await getHighlightsByBook(db, b.id);
          c[b.id] = h.length;
        })
      );
      setCounts(c);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  const confirmDeleteBook = useCallback(
    (book: Book) => {
      swipeRefs.current.get(book.id)?.close();
      Alert.alert(t('deleteBook'), t('deleteBookMsg'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            try {
              await deleteBook(db, book.id);
              setBooks((prev) => prev.filter((b) => b.id !== book.id));
              setCounts((prev) => {
                const next = { ...prev };
                delete next[book.id];
                return next;
              });
              if (activeBook?.id === book.id) {
                setActiveBook(null);
              }
            } catch (e) {
              Alert.alert(t('error'), String(e));
            }
          },
        },
      ]);
    },
    [db, t, activeBook, setActiveBook]
  );

  const handleBulkExport = async () => {
    if (!db || books.length === 0) {
      Alert.alert(t('nothingToExport'), t('nothingToExportMsg'));
      return;
    }
    setExporting(true);
    try {
      await bulkExport(books, (bookId) => getHighlightsByBook(db, bookId));
    } catch (e) {
      Alert.alert(t('exportFailed'), String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>// {t('libraryTitle')}</Text>
        <TouchableOpacity onPress={handleBulkExport} style={styles.exportBtn} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.mauve} />
          ) : (
            <Text style={styles.exportText}>{t('exportAll')}</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Swipeable
              ref={(ref: Swipeable | null) => { swipeRefs.current.set(item.id, ref); }}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteAction}
                  onPress={() => confirmDeleteBook(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteBracket}>[</Text>
                  <Feather name="trash-2" size={16} color={colors.maroon} />
                  <Text style={styles.deleteBracket}>]</Text>
                </TouchableOpacity>
              )}
            >
              <BookCard
                book={item}
                highlightCount={counts[item.id] ?? 0}
                onPress={() =>
                  navigation.navigate('BookDetail', {
                    bookId: item.id,
                    bookTitle: item.title,
                  })
                }
              />
            </Swipeable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyLine}>{t('noBooksFound')}</Text>
              <Text style={styles.emptyLine}>{t('noBooksHint')}</Text>
              <Text style={styles.emptyCursor}>█</Text>
            </View>
          }
        />
      )}

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.gearBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
        >
          <FontAwesome name="cog" size={18} color={colors.subtext0} />
        </TouchableOpacity>
      </SafeAreaView>

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
  exportBtn: { paddingHorizontal: 8, paddingVertical: 10, minWidth: 80, alignItems: 'flex-end' },
  exportText: {
    fontFamily: font.mono,
    color: colors.mauve,
    fontSize: 10,
    letterSpacing: 1,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 12, paddingBottom: 60 },
  deleteAction: {
    backgroundColor: colors.mantle,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 6,
    marginRight: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.maroon,
    gap: 4,
  },
  deleteBracket: {
    fontFamily: font.mono,
    color: colors.maroon,
    fontSize: 16,
  },
  empty: { padding: 32, gap: 8 },
  emptyLine: {
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: colors.surface0,
    backgroundColor: colors.mantle,
  },
  gearBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
