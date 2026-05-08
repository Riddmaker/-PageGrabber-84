import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { colors } from '../theme';
import { Book } from '../types';
import { AppDatabase } from '../database';
import { getAllBooks, createBook } from '../database/books';

interface BookModalProps {
  visible: boolean;
  db: AppDatabase | null;
  activeBook: Book | null;
  onSelect: (book: Book) => void;
  onClose: () => void;
}

export default function BookModal({
  visible,
  db,
  activeBook,
  onSelect,
  onClose,
}: BookModalProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  useEffect(() => {
    if (visible && db) {
      getAllBooks(db).then(setBooks);
    }
    if (!visible) {
      setCreating(false);
      setTitle('');
      setAuthor('');
    }
  }, [visible, db]);

  const handleCreate = async () => {
    if (!db || !title.trim()) return;
    const book: Book = {
      id: Crypto.randomUUID(),
      title: title.trim(),
      author: author.trim() || null,
      created_at: Date.now(),
    };
    try {
      await createBook(db, book);
      onSelect(book);
    } catch (e) {
      Alert.alert('Error', 'Could not create book.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>// SELECT BOOK</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {!creating ? (
            <>
              <FlatList
                data={books}
                keyExtractor={(b) => b.id}
                style={styles.list}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => onSelect(item)}
                    style={[
                      styles.bookRow,
                      activeBook?.id === item.id && styles.bookRowActive,
                    ]}
                  >
                    <Text style={styles.bookTitle} numberOfLines={1}>
                      {activeBook?.id === item.id ? '▶ ' : '  '}
                      {item.title}
                    </Text>
                    {item.author ? (
                      <Text style={styles.bookAuthor}>{item.author}</Text>
                    ) : null}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>No books yet. Create one below.</Text>
                }
              />
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setCreating(true)}
              >
                <Text style={styles.createBtnText}>[ + NEW BOOK ]</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>// TITLE *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Book title"
                placeholderTextColor={colors.overlay0}
                autoFocus
              />
              <Text style={styles.label}>// AUTHOR</Text>
              <TextInput
                style={styles.input}
                value={author}
                onChangeText={setAuthor}
                placeholder="Author name (optional)"
                placeholderTextColor={colors.overlay0}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() => setCreating(false)}
                  style={[styles.btn, { borderColor: colors.surface1 }]}
                >
                  <Text style={[styles.btnText, { color: colors.overlay1 }]}>
                    [ BACK ]
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreate}
                  style={[styles.btn, { borderColor: colors.green }]}
                >
                  <Text style={[styles.btnText, { color: colors.green }]}>
                    [ CREATE ]
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,27,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.base,
    borderTopWidth: 1,
    borderColor: colors.surface1,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.surface0,
  },
  title: {
    fontFamily: mono,
    color: colors.green,
    fontSize: 11,
    letterSpacing: 2,
  },
  closeBtn: {
    color: colors.overlay1,
    fontSize: 16,
  },
  list: { flex: 1 },
  bookRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.surface0,
  },
  bookRowActive: {
    backgroundColor: colors.surface0,
  },
  bookTitle: {
    fontFamily: mono,
    color: colors.text,
    fontSize: 14,
  },
  bookAuthor: {
    fontFamily: mono,
    color: colors.overlay1,
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    fontFamily: mono,
    color: colors.overlay0,
    textAlign: 'center',
    padding: 24,
    fontSize: 13,
  },
  createBtn: {
    borderTopWidth: 1,
    borderColor: colors.surface1,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  createBtnText: {
    fontFamily: mono,
    color: colors.mauve,
    fontSize: 13,
    letterSpacing: 1,
  },
  form: { padding: 20 },
  label: {
    fontFamily: mono,
    color: colors.overlay1,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    fontFamily: mono,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.surface0,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surface1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  btnText: {
    fontFamily: mono,
    fontSize: 12,
    letterSpacing: 1,
  },
});
