import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  TextLayoutEventData,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';

import { colors, font } from '../theme';
import { useBook } from '../context/BookContext';
import { useDatabase } from '../context/DatabaseContext';
import { useSettings } from '../context/SettingsContext';
import { recognizeText } from '../utils/ocr';
import { getAllBooks } from '../database/books';
import { createHighlight, deleteHighlight } from '../database/highlights';
import { Book, OcrWord, RootStackParamList } from '../types';
import { Feather } from '@expo/vector-icons';
import ScanlineOverlay from '../components/ScanlineOverlay';
import NoteModal from '../components/NoteModal';
import BookModal from '../components/BookModal';
import OcrHintBanner from '../components/OcrHintBanner';

type Phase = 'camera' | 'processing' | 'reviewing';

type PendingAction =
  | { type: 'savePage' }
  | { type: 'highlight'; text: string; note?: string; sel?: { start: number; end: number } }
  | null;

interface PageHighlight {
  id: string;
  start: number;
  end: number;
}

const HIGHLIGHT_SPAN_STYLE = { backgroundColor: 'rgba(166,227,161,0.55)' } as const;

interface TextLine {
  text: string; x: number; y: number; width: number; height: number;
  start: number; end: number;
}

interface HighlightZone {
  key: string; highlightId: string;
  x: number; y: number; width: number; height: number;
}

// Display-only: no onPress needed since the layer has pointerEvents="none"
function renderHighlightedText(text: string, highlights: PageHighlight[]): React.ReactNode[] {
  if (!highlights.length) return [text];
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const h of sorted) {
    const start = Math.max(h.start, cursor);
    const end = Math.min(h.end, text.length);
    if (start > cursor) parts.push(text.slice(cursor, start));
    if (end > start) {
      parts.push(
        <Text key={h.id} style={HIGHLIGHT_SPAN_STYLE}>
          {text.slice(start, end)}
        </Text>
      );
    }
    cursor = end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export default function CameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeBook, setActiveBook } = useBook();
  const { db } = useDatabase();
  const { t, hideOcrHint, setHideOcrHint } = useSettings();
  const [hintSessionDismissed, setHintSessionDismissed] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const pendingActionRef = useRef<PendingAction>(null);
  const lastSelectionRef = useRef({ start: 0, end: 0 });
  const activeHighlightRef = useRef<PageHighlight | null>(null);
  // Line layout data from onTextLayout — used to compute Pressable zones over highlights
  const textLinesRef = useRef<TextLine[]>([]);
  const [highlightZones, setHighlightZones] = useState<HighlightZone[]>([]);

  const savedOpacity = useRef(new Animated.Value(0)).current;
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [books, setBooks] = useState<Book[]>([]);
  const [phase, setPhase] = useState<Phase>('camera');
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [pageHighlights, setPageHighlights] = useState<PageHighlight[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<PageHighlight | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  const ocrText = useMemo(() => ocrWords.map((w) => w.text).join(' '), [ocrWords]);

  const getSelectedText = useCallback(
    () => ocrText.slice(lastSelectionRef.current.start, lastSelectionRef.current.end).trim(),
    [ocrText]
  );

  const setActiveHighlightBoth = useCallback((h: PageHighlight | null) => {
    activeHighlightRef.current = h;
    setActiveHighlight(h);
  }, []);

  const showSaved = useCallback(() => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    Animated.timing(savedOpacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    savedTimerRef.current = setTimeout(() => {
      Animated.timing(savedOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    }, 1100);
  }, [savedOpacity]);

  const openBookModal = useCallback(async () => {
    if (db) {
      try {
        setBooks(await getAllBooks(db));
      } catch (e) {
        console.error('[openBookModal]', e);
      }
    }
    setShowBookModal(true);
  }, [db]);

  // ── Capture ──────────────────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const taken = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!taken) return;
      setPhase('processing');
      const words = await recognizeText(taken.uri);
      if (!words.length) {
        Alert.alert(t('noTextFound'), t('noTextFoundMsg'));
        setPhase('camera');
        return;
      }
      setOcrWords(words);
      setPageHighlights([]);
      setActiveHighlightBoth(null);
      lastSelectionRef.current = { start: 0, end: 0 };
      setPhase('reviewing');
    } catch (err) {
      console.error(err);
      Alert.alert(t('error'), t('captureFailed'));
      setPhase('camera');
    }
  }, [setActiveHighlightBoth, t]);

  // ── Selection tracking ────────────────────────────────────────────────────────
  // Highlight zones (Pressable layer) handle delete-menu triggering.
  // This handler only needs to record valid text ranges and dismiss the delete
  // menu if the user long-presses somewhere outside a highlight zone.
  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const { start, end } = e.nativeEvent.selection;
      if (start === 0 && end === 0) return; // iOS focus event
      if (end > start) {
        lastSelectionRef.current = { start, end };
      }
      if (activeHighlightRef.current) {
        activeHighlightRef.current = null;
        setActiveHighlight(null);
      }
    },
    []
  );

  // ── Highlight touch zones ─────────────────────────────────────────────────────
  // Compute per-line pixel rects for each highlight using onTextLayout data.
  // Uses proportional character-count approximation (good enough for prose).
  const computeHighlightZones = useCallback((lines: TextLine[]) => {
    const zones: HighlightZone[] = [];
    for (const h of pageHighlights) {
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (h.end <= line.start || h.start >= line.end) continue;
        const overlapStart = Math.max(h.start, line.start);
        const overlapEnd = Math.min(h.end, line.end);
        const lineLen = line.end - line.start;
        if (lineLen === 0) continue;
        const xStart = line.x + ((overlapStart - line.start) / lineLen) * line.width;
        const xEnd = line.x + ((overlapEnd - line.start) / lineLen) * line.width;
        zones.push({
          key: `${h.id}-${li}`,
          highlightId: h.id,
          x: xStart,
          y: line.y,
          width: Math.max(xEnd - xStart, 20),
          height: line.height,
        });
      }
    }
    setHighlightZones(zones);
  }, [pageHighlights]);

  const handleTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      let cursor = 0;
      const lines: TextLine[] = e.nativeEvent.lines.map((line) => {
        const start = cursor;
        cursor += line.text.length;
        return { text: line.text, x: line.x, y: line.y, width: line.width, height: line.height, start, end: cursor };
      });
      textLinesRef.current = lines;
      computeHighlightZones(lines);
    },
    [computeHighlightZones]
  );

  useEffect(() => {
    computeHighlightZones(textLinesRef.current);
  }, [pageHighlights, computeHighlightZones]);

  // Track phase in a ref so the deletion-guard effect doesn't depend on it.
  // This way the effect only fires when activeBook changes, not on every phase transition.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // If the active book is deleted while reviewing a scan, discard and return to camera.
  // Must NOT include phase in deps — we only want this to fire when activeBook goes null,
  // not when phase changes to 'reviewing' (which would discard scans made without a book).
  useEffect(() => {
    if (activeBook === null && phaseRef.current === 'reviewing') {
      setOcrWords([]);
      setPageHighlights([]);
      setActiveHighlightBoth(null);
      lastSelectionRef.current = { start: 0, end: 0 };
      textLinesRef.current = [];
      setHighlightZones([]);
      setPhase('camera');
    }
  }, [activeBook, setActiveHighlightBoth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save helpers ──────────────────────────────────────────────────────────────
  const deleteFromPage = useCallback(
    async (id: string) => {
      if (!db) return;
      try {
        await deleteHighlight(db, id);
        setPageHighlights((prev) => prev.filter((h) => h.id !== id));
        setActiveHighlightBoth(null);
      } catch {
        Alert.alert(t('error'), t('couldNotRemove'));
      }
    },
    [db, setActiveHighlightBoth, t]
  );

  const doCommitHighlight = useCallback(
    async (book: Book, text: string, note?: string, sel?: { start: number; end: number }) => {
      if (!db || !text) return;
      const id = Crypto.randomUUID();
      await createHighlight(db, {
        id,
        book_id: book.id,
        image_uri: '',
        extracted_text: text,
        user_note: note?.trim() || null,
        bounding_boxes: '',
        created_at: Date.now(),
      });
      if (sel) {
        setPageHighlights((prev) => [...prev, { id, start: sel.start, end: sel.end }]);
      }
      lastSelectionRef.current = { start: 0, end: 0 };
      setShowNoteModal(false);
    },
    [db]
  );

  const doSavePage = useCallback(
    async (book: Book) => {
      if (!db || !ocrText) return;
      await createHighlight(db, {
        id: Crypto.randomUUID(),
        book_id: book.id,
        image_uri: '',
        extracted_text: ocrText,
        user_note: null,
        bounding_boxes: '',
        created_at: Date.now(),
      });
      setOcrWords([]);
      setPageHighlights([]);
      setActiveHighlightBoth(null);
      lastSelectionRef.current = { start: 0, end: 0 };
      setPhase('camera');
    },
    [db, ocrText, setActiveHighlightBoth]
  );

  // ── Public actions ────────────────────────────────────────────────────────────
  const handleSavePage = useCallback(async () => {
    if (!activeBook) {
      pendingActionRef.current = { type: 'savePage' };
      openBookModal();
      return;
    }
    await doSavePage(activeBook);
  }, [activeBook, doSavePage, openBookModal]);

  const commitHighlight = useCallback(
    async (note?: string) => {
      const text = getSelectedText();
      if (!text) {
        Alert.alert(t('noSelection'), t('noSelectionMsg'));
        return;
      }
      const sel = { start: lastSelectionRef.current.start, end: lastSelectionRef.current.end };
      if (!activeBook) {
        pendingActionRef.current = { type: 'highlight', text, note, sel };
        setShowNoteModal(false);
        openBookModal();
        return;
      }
      await doCommitHighlight(activeBook, text, note, sel);
      showSaved();
    },
    [activeBook, doCommitHighlight, getSelectedText, openBookModal, showSaved, t]
  );

  const handleNewScan = useCallback(() => {
    setOcrWords([]);
    setPageHighlights([]);
    setActiveHighlightBoth(null);
    lastSelectionRef.current = { start: 0, end: 0 };
    textLinesRef.current = [];
    setHighlightZones([]);
    setPhase('camera');
  }, [setActiveHighlightBoth]);

  const handleBookSelect = useCallback(
    (book: Book) => {
      setActiveBook(book);
      setShowBookModal(false);
      const pending = pendingActionRef.current;
      pendingActionRef.current = null;
      if (pending?.type === 'savePage') {
        doSavePage(book);
      } else if (pending?.type === 'highlight') {
        doCommitHighlight(book, pending.text, pending.note, pending.sel).then(showSaved);
      }
    },
    [setActiveBook, doSavePage, doCommitHighlight, showSaved]
  );

  const handleZoneActivate = useCallback(
    (highlightId: string) => {
      const h = pageHighlights.find((ph) => ph.id === highlightId);
      if (h) setActiveHighlightBoth(h);
    },
    [pageHighlights, setActiveHighlightBoth]
  );

  // ── Permission gates ──────────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }
  if (!permission.granted) {
    const denied = !permission.canAskAgain;
    return (
      <View style={styles.centered}>
        <Text style={styles.monoText}>
          {denied ? t('cameraPermissionDenied') : t('cameraPermission')}
        </Text>
        {denied ? (
          <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.outlineBtn}>
            <Text style={[styles.monoText, { color: colors.yellow }]}>[ {t('openSettings')} ]</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={requestPermission} style={styles.outlineBtn}>
            <Text style={[styles.monoText, { color: colors.green }]}>[ {t('grantPermission')} ]</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {phase === 'camera' && (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" autofocus="off" />
      )}

      {phase === 'processing' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={[styles.monoText, styles.processingLabel]}>{t('scanningText')}</Text>
        </View>
      )}

      {phase === 'reviewing' && (
        <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
          {/*
           * Three-layer text rendering:
           * Layer 1 — TextInput (editable=false): transparent text, handles all touch.
           *   - Native iOS long-press → text selection handles (no loupe).
           *   - contextMenuHidden suppresses Copy/Look Up popover.
           * Layer 2 — Pressable zones (absolute): invisible, sized to each highlight span.
           *   - Absorb ANY gesture (tap, long-press) on highlighted regions.
           *   - Touches elsewhere fall through to Layer 1 (native selection).
           * Layer 3 — absoluteFillObject (pointerEvents="none"): styled text + green spans.
           *   - Purely visual; fires onTextLayout so Layer 2 zones can be positioned.
           */}
          <View>
            <TextInput
              editable={false}
              showSoftInputOnFocus={false}
              caretHidden={true}
              multiline
              scrollEnabled={false}
              value={ocrText}
              onChangeText={() => {}}
              onSelectionChange={handleSelectionChange}
              contextMenuHidden={true}
              style={styles.selectionInput}
              textAlignVertical="top"
              allowFontScaling={false}
            />
            {highlightZones.map((zone) => (
              <Pressable
                key={zone.key}
                style={{ position: 'absolute', left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
                onPress={() => handleZoneActivate(zone.highlightId)}
                onLongPress={() => handleZoneActivate(zone.highlightId)}
              />
            ))}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <Text style={styles.pageText} allowFontScaling={false} onTextLayout={handleTextLayout}>
                {renderHighlightedText(ocrText, pageHighlights)}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      <ScanlineOverlay />

      {/* "saved!" toast */}
      <Animated.View style={[styles.savedToast, { opacity: savedOpacity }]} pointerEvents="none">
        <Text style={styles.savedToastText}>{t('saved')}</Text>
      </Animated.View>

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Library')} style={styles.iconBtn}>
          <Text style={styles.iconText}>☰</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openBookModal} style={styles.bookPill}>
          <Text style={styles.bookPillText} numberOfLines={1}>
            {activeBook ? activeBook.title : `[ ${t('tapToSelectBook')} ]`}
          </Text>
          <Text style={styles.caret}>▾</Text>
        </TouchableOpacity>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* Bottom bar — more opaque over the cream page */}
      <SafeAreaView
        edges={['bottom']}
        style={[styles.bottomBar, phase === 'reviewing' && styles.bottomBarReviewing]}
      >
        {phase === 'camera' && (
          <TouchableOpacity onPress={handleCapture} style={styles.captureRing} activeOpacity={0.8}>
            <View style={styles.captureDot} />
          </TouchableOpacity>
        )}

        {phase === 'reviewing' && (
          <View style={styles.reviewBtns}>
            {activeHighlight ? (
              /* Delete mode: entire menu replaced — trash on left, cancel on right */
              <View style={styles.reviewRow}>
                <Pressable
                  onPress={() => {
                    const h = activeHighlightRef.current;
                    activeHighlightRef.current = null;
                    setActiveHighlight(null);
                    if (h) deleteFromPage(h.id);
                  }}
                  style={({ pressed }) => [
                    styles.reviewBtn, styles.trashBtn,
                    pressed && styles.trashBtnPressed,
                  ]}
                >
                  <Feather name="trash-2" size={18} color={colors.red} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    activeHighlightRef.current = null;
                    setActiveHighlight(null);
                  }}
                  style={({ pressed }) => [
                    styles.reviewBtn, styles.deleteCancelBtn,
                    pressed && styles.deleteCancelBtnPressed,
                  ]}
                >
                  <Text style={[styles.reviewBtnText, { color: colors.overlay1 }]}>[ {t('cancel')} ]</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.reviewRow}>
                  <Pressable
                    onPress={() => commitHighlight()}
                    style={({ pressed }) => [
                      styles.reviewBtn, styles.highlightBtn,
                      pressed && styles.highlightBtnPressed,
                    ]}
                  >
                    <Text style={[styles.reviewBtnText, { color: colors.yellow }]}>[ {t('highlight')} ]</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowNoteModal(true)}
                    style={({ pressed }) => [
                      styles.reviewBtn, styles.highlightBtn,
                      pressed && styles.highlightBtnPressed,
                    ]}
                  >
                    <Text style={[styles.reviewBtnText, { color: colors.yellow }]}>[ {t('addNote')} ]</Text>
                  </Pressable>
                </View>
                <View style={styles.reviewRow}>
                  <Pressable
                    onPress={handleSavePage}
                    style={({ pressed }) => [
                      styles.reviewBtn, styles.wholePageBtn,
                      pressed && styles.wholePageBtnPressed,
                    ]}
                  >
                    <Text style={[styles.reviewBtnText, { color: colors.mauve }]}>[ {t('wholePage')} ]</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleNewScan}
                    style={({ pressed }) => [
                      styles.reviewBtn,
                      pressed && styles.newScanBtnPressed,
                    ]}
                  >
                    <Text style={styles.reviewBtnText}>[ {t('newScan')} ]</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      </SafeAreaView>

      {phase === 'camera' && !hideOcrHint && !hintSessionDismissed && (
        <OcrHintBanner
          onDismissSession={() => setHintSessionDismissed(true)}
          onDismissForever={() => setHideOcrHint(true)}
        />
      )}

      <NoteModal
        visible={showNoteModal}
        selectedText={getSelectedText()}
        onSave={(note) => commitHighlight(note)}
        onCancel={() => setShowNoteModal(false)}
      />

      <BookModal
        visible={showBookModal}
        db={db}
        books={books}
        activeBook={activeBook}
        onSelect={handleBookSelect}
        onClose={() => {
          pendingActionRef.current = null;
          setShowBookModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.crust },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.base, gap: 20,
  },
  monoText: {
    fontFamily: font.mono, color: colors.text, fontSize: 13,
    textAlign: 'center', paddingHorizontal: 24,
  },
  outlineBtn: {
    borderWidth: 1, borderColor: colors.green,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,17,27,0.65)',
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  processingLabel: { color: colors.green, letterSpacing: 3, fontSize: 12 },
  // ── Clean book page ───────────────────────────────────────────────────────────
  pageScroll: { flex: 1, backgroundColor: '#F4EDD3' },
  pageContent: { paddingHorizontal: 26, paddingTop: 110, paddingBottom: 165 },
  pageText: {
    fontFamily: font.book, fontSize: 18, lineHeight: 30,
    color: '#2D1F0E', backgroundColor: 'transparent', padding: 0,
  },
  selectionInput: {
    fontFamily: font.book, fontSize: 18, lineHeight: 30,
    color: 'transparent', backgroundColor: 'transparent',
    padding: 0, borderWidth: 0,
  },
  // ── Saved toast ───────────────────────────────────────────────────────────────
  savedToast: {
    position: 'absolute',
    bottom: 158,
    alignSelf: 'center',
    zIndex: 200,
    backgroundColor: colors.mantle,
    borderWidth: 1,
    borderColor: colors.green,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  savedToastText: {
    fontFamily: font.mono, color: colors.green, fontSize: 12, letterSpacing: 2,
  },
  // ── Top bar ───────────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingBottom: 10,
    backgroundColor: colors.overlayDark,
    borderBottomWidth: 1, borderColor: colors.surface1,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.text, fontSize: 20 },
  bookPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  bookPillText: {
    fontFamily: font.mono, color: colors.green, fontSize: 13, letterSpacing: 1, maxWidth: 220,
  },
  caret: { color: colors.overlay0, fontSize: 12 },
  // ── Bottom bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
    alignItems: 'center', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16,
    backgroundColor: colors.overlayMedium,
  },
  bottomBarReviewing: {
    backgroundColor: 'rgba(17,17,27,0.91)',
  },
  captureRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  captureDot: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.text },
  // ── Review buttons ────────────────────────────────────────────────────────────
  reviewBtns: { width: '100%', gap: 8 },
  reviewRow: { flexDirection: 'row', gap: 8 },
  reviewBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.green,
    paddingVertical: 11, alignItems: 'center',
  },
  highlightBtn: { borderColor: colors.yellow },
  highlightBtnPressed: { backgroundColor: 'rgba(249,226,175,0.18)' },
  wholePageBtn: { borderColor: colors.mauve },
  wholePageBtnPressed: { backgroundColor: 'rgba(203,166,247,0.18)' },
  newScanBtnPressed: { backgroundColor: 'rgba(166,227,161,0.18)' },
  reviewBtnText: { fontFamily: font.mono, color: colors.green, fontSize: 12, letterSpacing: 1 },
  // ── Delete strip ─────────────────────────────────────────────────────────────
  trashBtn: { borderColor: colors.red },
  trashBtnPressed: { backgroundColor: 'rgba(243,139,168,0.18)' },
  deleteCancelBtn: { borderColor: colors.surface1 },
  deleteCancelBtnPressed: { backgroundColor: 'rgba(108,112,134,0.18)' },
});
