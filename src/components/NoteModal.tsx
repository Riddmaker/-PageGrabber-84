import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { colors, font } from '../theme';
import { useSettings } from '../context/SettingsContext';

interface NoteModalProps {
  visible: boolean;
  selectedText: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}

export default function NoteModal({
  visible,
  selectedText,
  onSave,
  onCancel,
}: NoteModalProps) {
  const { t } = useSettings();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) setNote('');
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.label}>// {t('selectedText')}</Text>
          <Text style={styles.preview} numberOfLines={3}>
            {selectedText}
          </Text>

          <Text style={styles.label}>// {t('yourNote')}</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder={t('notePlaceholder')}
            placeholderTextColor={colors.overlay0}
            multiline
            autoFocus
            maxLength={1000}
          />

          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.cancelBtn]}>
              <Text style={[styles.btnText, { color: colors.overlay1 }]}>[ {t('cancel')} ]</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(note.trim())}
              style={[styles.btn, styles.saveBtn]}
            >
              <Text style={[styles.btnText, { color: colors.green }]}>[ {t('saveBtn')} ]</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,27,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.base,
    borderWidth: 1,
    borderColor: colors.surface1,
    padding: 20,
  },
  label: {
    fontFamily: font.mono,
    color: colors.overlay1,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 12,
  },
  preview: {
    fontFamily: font.mono,
    color: colors.subtext1,
    fontSize: 13,
    lineHeight: 20,
    backgroundColor: colors.surface0,
    padding: 10,
    marginBottom: 4,
  },
  input: {
    fontFamily: font.mono,
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: colors.surface0,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.surface1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  cancelBtn: { borderColor: colors.surface1 },
  saveBtn: { borderColor: colors.green },
  btnText: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
});
