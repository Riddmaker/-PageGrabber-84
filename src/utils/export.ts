import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  const exportDir = `${FileSystem.cacheDirectory}pg84_export/`;
  await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });

  for (const book of books) {
    const highlights = await getHighlights(book.id);
    const content = buildMarkdown(book, highlights);
    const filename = `${sanitizeFilename(book.title)}.md`;
    await FileSystem.writeAsStringAsync(`${exportDir}${filename}`, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  try {
    // react-native-zip-archive requires native build
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { zip } = require('react-native-zip-archive');
    const zipPath = `${FileSystem.cacheDirectory}PageGrabber84_Export.zip`;
    await zip(exportDir, zipPath);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(zipPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Export All Books',
      });
    }
  } catch {
    // Fallback: share individual files when zip module isn't available
    for (const book of books) {
      const filename = `${sanitizeFilename(book.title)}.md`;
      const path = `${exportDir}${filename}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await Sharing.shareAsync(path, { mimeType: 'text/markdown' });
      }
    }
  }
}
