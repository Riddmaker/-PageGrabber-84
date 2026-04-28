import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors } from '../theme';

interface ActionMenuProps {
  visible: boolean;
  onHighlight: () => void;
  onHighlightWithNote: () => void;
  onCancel: () => void;
}

export default function ActionMenu({
  visible,
  onHighlight,
  onHighlightWithNote,
  onCancel,
}: ActionMenuProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.menu}>
        <TouchableOpacity onPress={onHighlight} style={styles.btn}>
          <Text style={styles.btnText}>[ HIGHLIGHT ]</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity onPress={onHighlightWithNote} style={styles.btn}>
          <Text style={styles.btnText}>[ HIGHLIGHT + NOTE ]</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity onPress={onCancel} style={styles.btn}>
          <Text style={[styles.btnText, styles.cancelText]}>[ CANCEL ]</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  menu: {
    backgroundColor: colors.mantle,
    borderWidth: 1,
    borderColor: colors.yellow,
    paddingVertical: 4,
    minWidth: 260,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.yellow,
    fontSize: 13,
    letterSpacing: 1,
  },
  cancelText: {
    color: colors.overlay1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surface0,
    marginHorizontal: 16,
  },
});
