import { AppDatabase } from './index';
import { Book } from '../types';

export async function getAllBooks(db: AppDatabase): Promise<Book[]> {
  return db.getAllAsync<Book>('SELECT * FROM books ORDER BY created_at DESC');
}

export async function getBook(db: AppDatabase, id: string): Promise<Book | null> {
  return db.getFirstAsync<Book>('SELECT * FROM books WHERE id = ?', [id]);
}

export async function createBook(db: AppDatabase, book: Book): Promise<void> {
  await db.runAsync(
    'INSERT INTO books (id, title, author, created_at) VALUES (?, ?, ?, ?)',
    [book.id, book.title, book.author ?? null, book.created_at]
  );
}

export async function deleteBook(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
}
