import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { zip as createZip, strToU8 } from 'fflate';
import { Book, Highlight } from '../types';

function buildMarkdown(book: Book, highlights: Highlight[]): string {
  const lines: string[] = [
    `# ${book.title}`,
    `**Author:** ${book.author ?? 'Unknown'}`,
    '',
    '---',
    '',
  ];

  for (const h of highlights) {
    lines.push(`> ${h.extracted_text}`);
    if (h.user_note) {
      lines.push(`*Note: ${h.user_note}*`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_') || 'untitled';
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function exportBook(book: Book, highlights: Highlight[]): Promise<void> {
  const content = buildMarkdown(book, highlights);
  const filename = `${sanitizeFilename(book.title)}.md`;
  const path = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(path, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/markdown',
      dialogTitle: `Export — ${book.title}`,
    });
  }
}

export async function bulkExport(
  books: Book[],
  getHighlights: (bookId: string) => Promise<Highlight[]>
): Promise<void> {
  const files: Record<string, Uint8Array> = {};

  for (const book of books) {
    const highlights = await getHighlights(book.id);
    const content = buildMarkdown(book, highlights);
    const filename = `${sanitizeFilename(book.title)}.md`;
    files[filename] = strToU8(content);
  }

  const zipData = await new Promise<Uint8Array>((resolve, reject) => {
    createZip(files, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const zipPath = `${FileSystem.cacheDirectory}${date}_pagegrabber_export.zip`;

  await FileSystem.writeAsStringAsync(zipPath, uint8ToBase64(zipData), {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(zipPath, {
      mimeType: 'application/zip',
      dialogTitle: 'Export All Books',
    });
  }
}
