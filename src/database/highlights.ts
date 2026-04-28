import { AppDatabase } from './index';
import { Highlight } from '../types';

export async function getHighlightsByBook(
  db: AppDatabase,
  bookId: string
): Promise<Highlight[]> {
  return db.getAllAsync<Highlight>(
    'SELECT * FROM highlights WHERE book_id = ? ORDER BY created_at ASC',
    [bookId]
  );
}

export async function createHighlight(
  db: AppDatabase,
  highlight: Highlight
): Promise<void> {
  await db.runAsync(
    `INSERT INTO highlights
      (id, book_id, image_uri, extracted_text, user_note, bounding_boxes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      highlight.id,
      highlight.book_id,
      highlight.image_uri,
      highlight.extracted_text,
      highlight.user_note ?? null,
      highlight.bounding_boxes,
      highlight.created_at,
    ]
  );
}

export async function deleteHighlight(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM highlights WHERE id = ?', [id]);
}
