import { OcrWord, BoundingBox } from '../types';

// Mock data for Expo Go / development without native build
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
      words.push({
        id: `mock-${id++}`,
        text,
        frame: { x, y: 120 + lineIdx * 36, width: text.length * 12 + 8, height: 28 },
      });
      x += text.length * 12 + 16;
    });
  });
  return words;
}

function normalizeBounding(b: Record<string, number>): BoundingBox {
  // Handle both {left,top,right,bottom} and {x,y,width,height} formats
  if (typeof b.left === 'number') {
    return {
      x: b.left,
      y: b.top,
      width: typeof b.width === 'number' ? b.width : b.right - b.left,
      height: typeof b.height === 'number' ? b.height : b.bottom - b.top,
    };
  }
  return { x: b.x ?? 0, y: b.y ?? 0, width: b.width ?? 0, height: b.height ?? 0 };
}

export async function recognizeText(imageUri: string): Promise<OcrWord[]> {
  try {
    // react-native-mlkit-ocr requires a native build (EAS / expo run:android|ios)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const MlkitOcr = require('react-native-mlkit-ocr').default;
    const result: Array<{
      text: string;
      lines?: Array<{
        text: string;
        elements?: Array<{ text: string; bounding?: Record<string, number>; frame?: Record<string, number> }>;
      }>;
    }> = await MlkitOcr.detectFromUri(imageUri);

    const words: OcrWord[] = [];
    let idx = 0;
    for (const block of result) {
      for (const line of block.lines ?? []) {
        for (const el of line.elements ?? []) {
          const raw = el.bounding ?? el.frame ?? {};
          words.push({
            id: `w${idx++}`,
            text: el.text,
            frame: normalizeBounding(raw as Record<string, number>),
          });
        }
      }
    }
    return words;
  } catch {
    console.warn('[OCR] Native module unavailable — using mock data');
    return getMockWords();
  }
}
