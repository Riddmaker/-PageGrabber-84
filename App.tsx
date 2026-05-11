import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { BookProvider } from './src/context/BookContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
        <SettingsProvider>
          <BookProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </BookProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}
