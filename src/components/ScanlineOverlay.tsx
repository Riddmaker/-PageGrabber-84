import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
const SPACING = 5;
const LINE_OPACITY = 0.08;
const NUM_LINES = Math.ceil(SCREEN_H / SPACING);

export default function ScanlineOverlay() {
  const lines = useMemo(
    () => Array.from({ length: NUM_LINES }, (_, i) => i),
    []
  );

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {lines.map((i) => (
        <View
          key={i}
          style={[styles.line, { top: i * SPACING }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `rgba(0,0,0,${LINE_OPACITY})`,
  },
});
