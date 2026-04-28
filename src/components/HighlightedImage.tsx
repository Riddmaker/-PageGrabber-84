import React, { useState } from 'react';
import { View, Image, StyleSheet, LayoutChangeEvent } from 'react-native';
import { colors } from '../theme';
import { SavedBoundingBoxes, BoundingBox } from '../types';

interface HighlightedImageProps {
  imageUri: string;
  boundingBoxesJson: string;
}

function scaleFrame(
  frame: BoundingBox,
  imgW: number,
  imgH: number,
  displayW: number,
  displayH: number
): BoundingBox {
  const scale = Math.min(displayW / imgW, displayH / imgH);
  const renderedW = imgW * scale;
  const renderedH = imgH * scale;
  const offsetX = (displayW - renderedW) / 2;
  const offsetY = (displayH - renderedH) / 2;
  return {
    x: frame.x * scale + offsetX,
    y: frame.y * scale + offsetY,
    width: frame.width * scale,
    height: frame.height * scale,
  };
}

export default function HighlightedImage({
  imageUri,
  boundingBoxesJson,
}: HighlightedImageProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const boxes: SavedBoundingBoxes | null = React.useMemo(() => {
    try {
      return JSON.parse(boundingBoxesJson);
    } catch {
      return null;
    }
  }, [boundingBoxesJson]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const scaledFrame =
    boxes && containerSize.width > 0
      ? scaleFrame(
          boxes.merged,
          boxes.imageSize.width,
          boxes.imageSize.height,
          containerSize.width,
          containerSize.height
        )
      : null;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
      {scaledFrame && (
        <View
          pointerEvents="none"
          style={[
            styles.marker,
            {
              left: scaledFrame.x,
              top: scaledFrame.y,
              width: scaledFrame.width,
              height: scaledFrame.height,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.crust,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    position: 'absolute',
    backgroundColor: colors.highlightFill,
    borderRadius: 2,
  },
});
