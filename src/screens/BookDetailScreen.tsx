import React, { useCallback, useState } from 'react';
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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { useDatabase } from '../context/DatabaseContext';
import { getBook } from '../database/books';
import { getHighlightsByBook } from '../database/highlights';
import { exportBook } from '../utils/export';
import { Book, Highlight, RootStackParamList } from '../types';
import HighlightedImage from '../components/HighlightedImage';
import ScanlineOverlay from '../components/ScanlineOverlay';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export default function BookDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Props['route']>();
  const { bookId, bookTitle } = route.params;
  const { db } = useDatabase();

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

  const handleExport = async () => {
    if (!book) return;
    setExporting(true);
    try {
      await exportBook(book, highlights);
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookTitle}
        </Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.yellow} />
          ) : (
            <Text style={styles.exportText}>EXPORT</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {book ? (
        <View style={styles.meta}>
          {book.author ? (
            <Text style={styles.author}>by {book.author}</Text>
          ) : null}
          <Text style={styles.count}>
            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
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
              <HighlightedImage
                imageUri={item.image_uri}
                boundingBoxesJson={item.bounding_boxes}
              />
              <View style={styles.textBlock}>
                <Text style={styles.extractedText}>"{item.extracted_text}"</Text>
                {item.user_note ? (
                  <Text style={styles.noteText}>// {item.user_note}</Text>
                ) : null}
                <Text style={styles.timestamp}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {'> No highlights yet.\n> Go back and capture a page.'}
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
    color: colors.text,
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  exportBtn: { paddingHorizontal: 8, paddingVertical: 10, minWidth: 60, alignItems: 'flex-end' },
  exportText: {
    fontFamily: mono,
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
    fontFamily: mono,
    color: colors.subtext0,
    fontSize: 11,
  },
  count: {
    fontFamily: mono,
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
    backgroundColor: colors.surface0,
  },
  textBlock: {
    padding: 14,
    borderTopWidth: 1,
    borderColor: colors.surface1,
  },
  extractedText: {
    fontFamily: mono,
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  noteText: {
    fontFamily: mono,
    color: colors.yellow,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  timestamp: {
    fontFamily: mono,
    color: colors.overlay0,
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 1,
  },
  empty: { padding: 32, gap: 8 },
  emptyText: {
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
