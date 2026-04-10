import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Theme } from '../constants/colors';

interface ThemeContextType {
  theme: Theme;
  colors: typeof Colors.dark;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: Colors.dark,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    AsyncStorage.getItem('abu-theme').then((saved) => {
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
    });
  }, []);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    await AsyncStorage.setItem('abu-theme', t);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, colors: Colors[theme], toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
