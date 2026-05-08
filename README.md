# 📟 PageGrabber '84

A frictionless, retro-styled mobile app that bridges physical books and your digital second brain. Snap a page, highlight passages natively like an e-reader, and export your notes straight to Obsidian-flavoured Markdown.

Built with React Native & Expo. Dark mode powered by [Catppuccin Mocha](https://github.com/catppuccin/catppuccin).

---

## Features

- **On-device OCR** — powered by Google ML Kit, no internet required, no data leaves your phone
- **Native text selection** — long-press and drag to highlight passages, just like an e-reader
- **Book library** — organise highlights by book with title, author, and date
- **Obsidian export** — single book as `.md` or bulk collection as a date-stamped `.zip`
- **13 languages** — EN, DE, FR, IT, ES, PT, NL, RU, JA, ZH, KO, PL, SV
- **Retro CRT aesthetic** — Catppuccin Mocha palette, scanline overlay, monospace UI throughout

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navigation | React Navigation (native stack) |
| Database | expo-sqlite |
| OCR | react-native-mlkit-ocr (on-device) |
| Export | fflate (pure JS ZIP) |
| Gestures | react-native-gesture-handler |
| Design system | Catppuccin Mocha |

---

## Tips for best results

OCR accuracy improves significantly with less text in frame. Frame as tightly as possible around the passage you want to capture — cropping out surrounding text will give you cleaner results.

---

## Feedback & bugs

Found something? [Open an issue](https://github.com/Riddmaker/-PageGrabber-84/issues/new) — all feedback is welcome.

---

*PageGrabber '84 — because good ideas deserve to leave the page.*
