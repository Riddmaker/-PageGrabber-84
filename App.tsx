import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { BookProvider } from './src/context/BookContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <DatabaseProvider>
      <BookProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </BookProvider>
    </DatabaseProvider>
  );
}
