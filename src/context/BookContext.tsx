import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import { useDatabase } from './DatabaseContext';
import { getBook } from '../database/books';
import { getSetting, saveSetting } from '../database';

interface BookContextType {
  activeBook: Book | null;
  setActiveBook: (book: Book | null) => void;
}

const BookContext = createContext<BookContextType>({
  activeBook: null,
  setActiveBook: () => {},
});

export function BookProvider({ children }: { children: React.ReactNode }) {
  const { db } = useDatabase();
  const [activeBook, setActiveBookState] = useState<Book | null>(null);

  useEffect(() => {
    if (!db) return;
    (async () => {
      const savedId = await getSetting(db, 'active_book_id');
      if (savedId) {
        const book = await getBook(db, savedId);
        if (book) setActiveBookState(book);
      }
    })().catch(console.error);
  }, [db]);

  const setActiveBook = useCallback(
    (book: Book | null) => {
      setActiveBookState(book);
      if (db) {
        saveSetting(db, 'active_book_id', book?.id ?? '').catch(console.error);
      }
    },
    [db]
  );

  return (
    <BookContext.Provider value={{ activeBook, setActiveBook }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  return useContext(BookContext);
}
