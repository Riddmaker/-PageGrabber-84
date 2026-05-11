import React, { useState } from 'react';
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
import { colors, font } from '../theme';
import { useSettings } from '../context/SettingsContext';
import { Book } from '../types';
import { AppDatabase } from '../database';
import { createBook } from '../database/books';

interface BookModalProps {
  visible: boolean;
  db: AppDatabase | null;
  books: Book[];
  activeBook: Book | null;
  onSelect: (book: Book) => void;
  onClose: () => void;
}

export default function BookModal({
  visible,
  db,
  books,
  activeBook,
  onSelect,
  onClose,
}: BookModalProps) {
  const { t } = useSettings();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  const resetForm = () => {
    setCreating(false);
    setTitle('');
    setAuthor('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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
      resetForm();
      onSelect(book);
    } catch (e) {
      Alert.alert(t('error'), t('couldNotCreateBook'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>// {t('selectBook')}</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>[ x ]</Text>
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
                    onPress={() => {
                      resetForm();
                      onSelect(item);
                    }}
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
                  <Text style={styles.empty}>{t('noBooksYet')}</Text>
                }
              />
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setCreating(true)}
              >
                <Text style={styles.createBtnText}>[ {t('newBook')} ]</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>// {t('titleLabel')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('titlePlaceholder')}
                placeholderTextColor={colors.overlay0}
                autoFocus
              />
              <Text style={styles.label}>// {t('authorLabel')}</Text>
              <TextInput
                style={styles.input}
                value={author}
                onChangeText={setAuthor}
                placeholder={t('authorPlaceholder')}
                placeholderTextColor={colors.overlay0}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() => setCreating(false)}
                  style={[styles.btn, { borderColor: colors.surface1 }]}
                >
                  <Text style={[styles.btnText, { color: colors.overlay1 }]}>
                    [ {t('backBtn')} ]
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreate}
                  style={[styles.btn, { borderColor: colors.green }]}
                >
                  <Text style={[styles.btnText, { color: colors.green }]}>
                    [ {t('createBtn')} ]
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
    height: '60%',
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
  headerTitle: {
    fontFamily: font.mono,
    color: colors.green,
    fontSize: 11,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontFamily: font.mono,
    color: colors.overlay1,
    fontSize: 12,
    letterSpacing: 1,
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
    fontFamily: font.mono,
    color: colors.text,
    fontSize: 14,
  },
  bookAuthor: {
    fontFamily: font.mono,
    color: colors.overlay1,
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    fontFamily: font.mono,
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
    fontFamily: font.mono,
    color: colors.mauve,
    fontSize: 13,
    letterSpacing: 1,
  },
  form: { padding: 20 },
  label: {
    fontFamily: font.mono,
    color: colors.overlay1,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    fontFamily: font.mono,
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
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
});
