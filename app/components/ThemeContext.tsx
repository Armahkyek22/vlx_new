import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  theme: ThemeType;
  accentColor: string;
  setTheme: (theme: ThemeType) => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const ACCENT_COLOR_KEY = 'APP_ACCENT_COLOR';
const THEME_KEY = 'APP_THEME';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>('dark');
  const [accentColor, setAccentColorState] = useState<string>('#F44BF8');

  useEffect(() => {
    (async () => {
      const storedTheme = await AsyncStorage.getItem(THEME_KEY);
      const storedAccent = await AsyncStorage.getItem(ACCENT_COLOR_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark') setThemeState(storedTheme);
      if (storedAccent) setAccentColorState(storedAccent);
    })();
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_KEY, newTheme);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    AsyncStorage.setItem(ACCENT_COLOR_KEY, color);
  };

  return (
    <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
