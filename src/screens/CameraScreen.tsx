import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

import { colors } from '../theme';
import { useBook } from '../context/BookContext';
import { useDatabase } from '../context/DatabaseContext';
import { recognizeText } from '../utils/ocr';
import { createHighlight } from '../database/highlights';
import { OcrWord, BoundingBox, SavedBoundingBoxes, RootStackParamList } from '../types';
import ScanlineOverlay from '../components/ScanlineOverlay';
import ActionMenu from '../components/ActionMenu';
import NoteModal from '../components/NoteModal';
import BookModal from '../components/BookModal';

const { width: SW, height: SH } = Dimensions.get('window');

type Phase = 'camera' | 'processing' | 'reviewing';

interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

interface SessionHighlight {
  id: string;
  scaledFrame: BoundingBox;
}

function calcLayout(imgW: number, imgH: number, dispW: number, dispH: number) {
  const scale = Math.min(dispW / imgW, dispH / imgH);
  const rW = imgW * scale;
  const rH = imgH * scale;
  return { scale, offsetX: (dispW - rW) / 2, offsetY: (dispH - rH) / 2 };
}

function mergeFrames(frames: BoundingBox[]): BoundingBox {
  if (!frames.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...frames.map((f) => f.x));
  const minY = Math.min(...frames.map((f) => f.y));
  const maxX = Math.max(...frames.map((f) => f.x + f.width));
  const maxY = Math.max(...frames.map((f) => f.y + f.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export default function CameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeBook, setActiveBook } = useBook();
  const { db } = useDatabase();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>('camera');
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [sessionHighlights, setSessionHighlights] = useState<SessionHighlight[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!activeBook) {
      setShowBookModal(true);
      return;
    }
    if (!cameraRef.current) return;

    try {
      const taken = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!taken) return;

      const dir = `${FileSystem.documentDirectory}captures/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}${Crypto.randomUUID()}.jpg`;
      await FileSystem.copyAsync({ from: taken.uri, to: dest });

      const p: CapturedPhoto = {
        uri: dest,
        width: taken.width ?? 1200,
        height: taken.height ?? 1600,
      };
      setPhoto(p);
      setPhase('processing');

      const words = await recognizeText(dest);
      setOcrWords(words);
      setPhase('reviewing');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to capture. Please try again.');
      setPhase('camera');
    }
  }, [activeBook]);

  const handleWordLongPress = useCallback((wordId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([wordId]));
    setShowActionMenu(true);
  }, []);

  const handleWordPress = useCallback(
    (wordId: string) => {
      if (!selectionMode) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(wordId) ? next.delete(wordId) : next.add(wordId);
        return next;
      });
    },
    [selectionMode]
  );

  const getSelectedWords = () => ocrWords.filter((w) => selectedIds.has(w.id));

  const commitHighlight = useCallback(
    async (note?: string) => {
      if (!db || !photo || !activeBook || selectedIds.size === 0) return;

      const words = getSelectedWords();
      const merged = mergeFrames(words.map((w) => w.frame));

      const boxes: SavedBoundingBoxes = {
        words: words.map((w) => ({ text: w.text, frame: w.frame })),
        merged,
        imageSize: { width: photo.width, height: photo.height },
      };

      const id = Crypto.randomUUID();
      await createHighlight(db, {
        id,
        book_id: activeBook.id,
        image_uri: photo.uri,
        extracted_text: words.map((w) => w.text).join(' '),
        user_note: note?.trim() || null,
        bounding_boxes: JSON.stringify(boxes),
        created_at: Date.now(),
      });

      const layout = calcLayout(photo.width, photo.height, SW, SH);
      const sf: BoundingBox = {
        x: merged.x * layout.scale + layout.offsetX,
        y: merged.y * layout.scale + layout.offsetY,
        width: merged.width * layout.scale,
        height: merged.height * layout.scale,
      };

      setSessionHighlights((prev) => [...prev, { id, scaledFrame: sf }]);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowActionMenu(false);
      setShowNoteModal(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, photo, activeBook, selectedIds, ocrWords]
  );

  const handleNewScan = () => {
    setPhoto(null);
    setOcrWords([]);
    setSelectedIds(new Set());
    setSelectionMode(false);
    setSessionHighlights([]);
    setShowActionMenu(false);
    setPhase('camera');
  };

  // ── Permission gates ────────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.monoText}>Camera access required.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.outlineBtn}>
          <Text style={[styles.monoText, { color: colors.green }]}>
            [ GRANT PERMISSION ]
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const layout = photo ? calcLayout(photo.width, photo.height, SW, SH) : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Background: live camera or frozen photo */}
      {phase === 'camera' ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
      ) : (
        photo && (
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="contain"
          />
        )
      )}

      {/* Processing spinner */}
      {phase === 'processing' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={[styles.monoText, styles.processingLabel]}>SCANNING TEXT...</Text>
        </View>
      )}

      {/* Invisible word overlays */}
      {phase === 'reviewing' &&
        layout &&
        ocrWords.map((word) => {
          const isSelected = selectedIds.has(word.id);
          const sf = {
            left: word.frame.x * layout.scale + layout.offsetX,
            top: word.frame.y * layout.scale + layout.offsetY,
            width: Math.max(word.frame.width * layout.scale, 24),
            height: Math.max(word.frame.height * layout.scale, 24),
          };
          return (
            <TouchableOpacity
              key={word.id}
              onPress={() => handleWordPress(word.id)}
              onLongPress={() => handleWordLongPress(word.id)}
              delayLongPress={350}
              style={[
                styles.wordTap,
                {
                  position: 'absolute',
                  left: sf.left,
                  top: sf.top,
                  width: sf.width,
                  height: sf.height,
                },
                isSelected && styles.wordSelected,
              ]}
            />
          );
        })}

      {/* Committed highlight markers (this session) */}
      {phase === 'reviewing' &&
        sessionHighlights.map((h) => (
          <View
            key={h.id}
            pointerEvents="none"
            style={[
              styles.highlightMarker,
              {
                position: 'absolute',
                left: h.scaledFrame.x,
                top: h.scaledFrame.y,
                width: h.scaledFrame.width,
                height: h.scaledFrame.height,
              },
            ]}
          />
        ))}

      {/* Retro scanlines */}
      <ScanlineOverlay />

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Library')}
          style={styles.iconBtn}
        >
          <Text style={styles.iconText}>☰</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowBookModal(true)} style={styles.bookPill}>
          <Text style={styles.bookPillText} numberOfLines={1}>
            {activeBook ? activeBook.title : '[ tap to select book ]'}
          </Text>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>

        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {phase === 'camera' && (
          <TouchableOpacity onPress={handleCapture} style={styles.captureRing} activeOpacity={0.8}>
            <View style={styles.captureDot} />
          </TouchableOpacity>
        )}
        {phase === 'reviewing' && (
          <TouchableOpacity onPress={handleNewScan} style={styles.newScanBtn}>
            <Text style={styles.newScanText}>[ NEW SCAN ]</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Floating action menu */}
      <ActionMenu
        visible={showActionMenu && selectedIds.size > 0}
        onHighlight={() => commitHighlight()}
        onHighlightWithNote={() => {
          setShowActionMenu(false);
          setShowNoteModal(true);
        }}
        onCancel={() => {
          setSelectedIds(new Set());
          setSelectionMode(false);
          setShowActionMenu(false);
        }}
      />

      {/* Note modal */}
      <NoteModal
        visible={showNoteModal}
        selectedText={getSelectedWords()
          .map((w) => w.text)
          .join(' ')}
        onSave={(note) => commitHighlight(note)}
        onCancel={() => {
          setShowNoteModal(false);
          setShowActionMenu(true);
        }}
      />

      {/* Book select modal */}
      <BookModal
        visible={showBookModal}
        db={db}
        activeBook={activeBook}
        onSelect={(book) => {
          setActiveBook(book);
          setShowBookModal(false);
        }}
        onClose={() => setShowBookModal(false)}
      />
    </View>
  );
}

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.crust },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.base,
    gap: 20,
  },
  monoText: {
    fontFamily: mono,
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,17,27,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  processingLabel: {
    color: colors.green,
    letterSpacing: 3,
    fontSize: 12,
  },
  wordTap: {
    opacity: 0,
  },
  wordSelected: {
    backgroundColor: colors.highlightSelected,
    opacity: 1,
    borderRadius: 2,
  },
  highlightMarker: {
    backgroundColor: colors.highlightFill,
    borderRadius: 2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: colors.overlayDark,
    borderBottomWidth: 1,
    borderColor: colors.surface1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.text,
    fontSize: 20,
  },
  bookPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bookPillText: {
    fontFamily: mono,
    color: colors.green,
    fontSize: 13,
    letterSpacing: 1,
    maxWidth: 220,
  },
  caret: {
    color: colors.overlay0,
    fontSize: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.overlayMedium,
  },
  captureRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text,
  },
  newScanBtn: {
    borderWidth: 1,
    borderColor: colors.green,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  newScanText: {
    fontFamily: mono,
    color: colors.green,
    fontSize: 13,
    letterSpacing: 2,
  },
});
