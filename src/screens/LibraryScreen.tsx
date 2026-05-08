import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { useDatabase } from '../context/DatabaseContext';
import { getAllBooks } from '../database/books';
import { getHighlightsByBook } from '../database/highlights';
import { bulkExport } from '../utils/export';
import { Book, RootStackParamList } from '../types';
import BookCard from '../components/BookCard';
import ScanlineOverlay from '../components/ScanlineOverlay';

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { db } = useDatabase();

  const [books, setBooks] = useState<Book[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  const handleBulkExport = async () => {
    if (!db || books.length === 0) {
      Alert.alert('Nothing to export', 'Add some books and highlights first.');
      return;
    }
    setExporting(true);
    try {
      await bulkExport(books, (bookId) => getHighlightsByBook(db, bookId));
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>// LIBRARY</Text>
        <TouchableOpacity onPress={handleBulkExport} style={styles.exportBtn} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.mauve} />
          ) : (
            <Text style={styles.exportText}>EXPORT ALL</Text>
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
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyLine}>{'> No books found.'}</Text>
              <Text style={styles.emptyLine}>{'> Go back and select a book to begin.'}</Text>
              <Text style={styles.emptyCursor}>█</Text>
            </View>
          }
        />
      )}

      <ScanlineOverlay />
    </View>
  );
}

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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
    fontFamily: mono,
    color: colors.subtext0,
    fontSize: 13,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: mono,
    color: colors.green,
    fontSize: 12,
    letterSpacing: 3,
  },
  exportBtn: { paddingHorizontal: 8, paddingVertical: 10, minWidth: 80, alignItems: 'flex-end' },
  exportText: {
    fontFamily: mono,
    color: colors.mauve,
    fontSize: 10,
    letterSpacing: 1,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 12 },
  empty: {
    padding: 32,
    gap: 8,
  },
  emptyLine: {
    fontFamily: mono,
    color: colors.overlay0,
    fontSize: 13,
    lineHeight: 22,
  },
  emptyCursor: {
    fontFamily: mono,
    color: colors.green,
    fontSize: 13,
    marginTop: 8,
  },
});
