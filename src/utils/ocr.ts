import * as ImageManipulator from 'expo-image-manipulator';
import { OcrWord, BoundingBox } from '../types';

// ─── Provider interface ────────────────────────────────────────────────────

interface OcrProvider {
  recognizeText(imageUri: string): Promise<OcrWord[]>;
}

// ─── ML Kit v2 provider (on-device, no network) ───────────────────────────

interface MlKitLine {
  text: string;
  frame: { x: number; y: number; width: number; height: number };
}
interface MlKitBlock { lines: MlKitLine[] }
interface MlKitResult { blocks: MlKitBlock[] }

class MlKitOcrProvider implements OcrProvider {
  async recognizeText(imageUri: string): Promise<OcrWord[]> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: TextRecognition, TextRecognitionScript } =
      require('@react-native-ml-kit/text-recognition') as {
        default: { recognize(uri: string, script: string): Promise<MlKitResult> };
        TextRecognitionScript: { LATIN: string };
      };

    // Bake EXIF rotation into pixels before handing to ML Kit.
    // Android cameras often store raw sensor data + an EXIF "rotate me" tag;
    // ML Kit ignores that tag and reads pixels as-is, producing rotated blocks.
    const { uri: normalizedUri } = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    const runOcr = async (uri: string) => {
      const result = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);
      const lines: Array<{ text: string; frame: BoundingBox }> = [];
      for (const block of result.blocks ?? []) {
        for (const line of block.lines ?? []) {
          const text = line.text?.trim();
          if (!text) continue;
          lines.push({ text, frame: normalizeBounding(line.frame) });
        }
      }
      return lines;
    };

    let lines = await runOcr(normalizedUri);

    // If very few lines came back the image is likely rotated 90°
    // (e.g. phone held portrait, book turned sideways to frame fewer lines).
    // Try both directions and keep whichever yields the most text.
    if (lines.length < 4) {
      for (const angle of [90, -90] as const) {
        const { uri: rotatedUri } = await ImageManipulator.manipulateAsync(
          normalizedUri,
          [{ rotate: angle }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        const rotatedLines = await runOcr(rotatedUri);
        if (rotatedLines.length > lines.length) {
          lines = rotatedLines;
        }
      }
    }

    // ML Kit v2 has better layout analysis than v1 but block order is still not
    // guaranteed across the full page — sort into reading order to be safe.
    if (lines.length > 1) {
      const tolerance = median(lines.map((l) => l.frame.height)) * 0.5;
      lines.sort((a, b) => {
        const dy = a.frame.y - b.frame.y;
        if (Math.abs(dy) < tolerance) return a.frame.x - b.frame.x;
        return dy;
      });
    }

    return lines.map((l, i) => ({ id: `w${i}`, text: l.text, frame: l.frame }));
  }
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// ─── Mock provider (Expo Go / simulator fallback) ─────────────────────────

class MockOcrProvider implements OcrProvider {
  async recognizeText(_imageUri: string): Promise<OcrWord[]> {
    return getMockWords();
  }
}

// ─── Provider selection ────────────────────────────────────────────────────

let _provider: OcrProvider | null = null;

function getProvider(): OcrProvider {
  if (_provider) return _provider;

  try {
    require('@react-native-ml-kit/text-recognition');
    _provider = new MlKitOcrProvider();
  } catch {
    console.warn('[OCR] @react-native-ml-kit/text-recognition not available — using mock data (Expo Go / simulator)');
    _provider = new MockOcrProvider();
  }

  return _provider;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function recognizeText(imageUri: string): Promise<OcrWord[]> {
  try {
    return await getProvider().recognizeText(imageUri);
  } catch (e) {
    console.error('[OCR] Provider failed, falling back to mock:', e);
    return getMockWords();
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeBounding(
  b: Partial<Record<'left' | 'top' | 'right' | 'bottom' | 'x' | 'y' | 'width' | 'height', number>>
): BoundingBox {
  if (typeof b.left === 'number') {
    return {
      x: b.left,
      y: b.top ?? 0,
      width:  typeof b.width  === 'number' ? b.width  : (b.right  ?? 0) - b.left,
      height: typeof b.height === 'number' ? b.height : (b.bottom ?? 0) - (b.top ?? 0),
    };
  }
  return { x: b.x ?? 0, y: b.y ?? 0, width: b.width ?? 0, height: b.height ?? 0 };
}

function getMockWords(): OcrWord[] {
  const lines = [
    ['The', 'quick', 'brown', 'fox', 'jumps'],
    ['over', 'the', 'lazy', 'dog.'],
    ['Pack', 'my', 'box', 'with', 'five'],
    ['dozen', 'liquor', 'jugs.'],
  ];
  const words: OcrWord[] = [];
  let id = 0;
  lines.forEach((lineWords, lineIdx) => {
    let x = 40;
    lineWords.forEach((text) => {
      words.push({ id: `mock-${id++}`, text, frame: { x, y: 120 + lineIdx * 36, width: text.length * 12 + 8, height: 28 } });
      x += text.length * 12 + 16;
    });
  });
  return words;
}
