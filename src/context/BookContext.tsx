import React, { createContext, useContext, useState } from 'react';
import { Book } from '../types';

interface BookContextType {
  activeBook: Book | null;
  setActiveBook: (book: Book | null) => void;
}

const BookContext = createContext<BookContextType>({
  activeBook: null,
  setActiveBook: () => {},
});

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [activeBook, setActiveBook] = useState<Book | null>(null);

  return (
    <BookContext.Provider value={{ activeBook, setActiveBook }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  return useContext(BookContext);
}
