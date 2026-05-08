# PageGrabber '84 — Codebase Guide

## What this is
React Native / Expo app (SDK 52). Opens to a full-screen camera. Captures book pages, runs on-device OCR, lets users highlight text with a native-feeling long-press gesture, and exports highlights to Obsidian-formatted Markdown.

## Stack
- **Expo SDK 52** (managed workflow → EAS Build for native modules)
- **expo-sqlite** — local SQLite database (Highlights + Books tables)
- **expo-camera** — live camera and capture
- **expo-file-system / expo-sharing** — file I/O and OS share sheet
- **react-navigation native-stack** — Camera → Library → BookDetail
- **react-native-mlkit-ocr** — on-device text recognition (needs EAS Build, not Expo Go)
- **react-native-zip-archive** — bulk-export ZIP (needs EAS Build)

## File map
```
src/
  types/index.ts          — all shared TS types (Book, Highlight, OcrWord, …)
  theme/index.ts          — Catppuccin Mocha palette + common styles
  database/
    index.ts              — openDatabase(), creates tables
    books.ts              — getAllBooks / getBook / createBook / deleteBook
    highlights.ts         — getHighlightsByBook / createHighlight / deleteHighlight
  context/
    DatabaseContext.tsx   — async DB init, exposes { db, isReady }
    BookContext.tsx        — active book state
  utils/
    ocr.ts                — recognizeText(uri) → OcrWord[]; falls back to mock in Expo Go
    export.ts             — exportBook() single MD share; bulkExport() zip all
  components/
    ScanlineOverlay.tsx   — retro CRT scanline effect (pure View)
    ActionMenu.tsx        — floating [HIGHLIGHT] / [HIGHLIGHT+NOTE] / [CANCEL] menu
    NoteModal.tsx         — transparent note-input modal (KeyboardAvoidingView)
    BookModal.tsx         — bottom-sheet to create / switch active book
    BookCard.tsx          — library list item
    HighlightedImage.tsx  — image + scaled yellow-marker overlay from saved bounding_boxes JSON
  screens/
    CameraScreen.tsx      — full-screen camera, OCR flow, word tap-selection, session highlights
    LibraryScreen.tsx     — bookshelf list + bulk export
    BookDetailScreen.tsx  — scrollable highlight feed + single-book export
  navigation/
    AppNavigator.tsx      — native stack, no headers
```

## Getting started

### Expo Go (limited — no OCR or ZIP)
```sh
npm install
npx expo start
```
OCR falls back to mock words. ZIP export falls back to individual file shares.

### Full native features (EAS Development Build)
```sh
npm install -g eas-cli
eas login
eas build --profile development --platform android   # or ios
```
Then scan the QR from `npx expo start --dev-client`.

## Key design decisions

### Highlighting engine
Words are invisible `TouchableOpacity` components absolutely positioned over the photo using scaled OCR bounding boxes. Long-press starts selection mode; subsequent taps add/remove words. No custom gesture tracking — intentionally simple and cross-platform.

### Scaling OCR coordinates
`calcLayout(imgW, imgH, dispW, dispH)` returns `{ scale, offsetX, offsetY }` matching `resizeMode="contain"` letterbox math. Applied both at highlight-time (CameraScreen) and render-time (HighlightedImage).

### Bounding box storage
`SavedBoundingBoxes` JSON stored in `highlights.bounding_boxes`:
```ts
{ words: [{text, frame}], merged: BoundingBox, imageSize: {width, height} }
```
`imageSize` lets `HighlightedImage` recalculate scale at any display size.

### Native module graceful degradation
Both `react-native-mlkit-ocr` and `react-native-zip-archive` are `require()`d inside try/catch. When unavailable (Expo Go), OCR returns mock words and export shares individual `.md` files instead of a `.zip`.

## Assets needed
Place in `assets/`:
- `icon.png` (1024×1024)
- `adaptive-icon.png` (1024×1024, Android)
- `splash.png` (optional)

## EAS project ID
Replace `"your-eas-project-id-here"` in `app.json` after running `eas init`.
