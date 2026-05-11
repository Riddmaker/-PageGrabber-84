import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, font } from '../theme';
import { useSettings } from '../context/SettingsContext';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  highlightCount?: number;
  onPress: () => void;
}

export default function BookCard({ book, highlightCount = 0, onPress }: BookCardProps) {
  const { t, formatDate } = useSettings();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.leftBar} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        {book.author ? (
          <Text style={styles.author} numberOfLines={1}>
            {t('byAuthor')} {book.author}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.metaText}>{formatDate(book.created_at)}</Text>
          <Text style={styles.metaText}>
            {highlightCount}{' '}
            {highlightCount === 1 ? t('highlightSingular') : t('highlightPlural')}
          </Text>
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface0,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.surface1,
  },
  leftBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.mauve,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  title: {
    fontFamily: font.mono,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  author: {
    fontFamily: font.mono,
    color: colors.subtext0,
    fontSize: 11,
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: {
    fontFamily: font.mono,
    color: colors.overlay0,
    fontSize: 10,
    letterSpacing: 1,
  },
  arrow: {
    color: colors.overlay1,
    fontSize: 22,
    paddingRight: 14,
  },
});
