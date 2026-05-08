import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppDatabase, openDatabase } from '../database';

interface DatabaseContextType {
  db: AppDatabase | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({ db: null, isReady: false });

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    openDatabase().then((database) => {
      setDb(database);
      setIsReady(true);
    });
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
