import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type AccentColorId = 'purple' | 'blue' | 'orange' | 'green' | 'red' | 'teal' | 'yellow' | 'indigo';

const ACCENT_COLOR_MAP: Record<AccentColorId, string> = {
  purple: '#F44BF8',
  blue: '#2563EB',
  orange: '#EA580C',
  green: '#16A34A',
  red: '#EF4444',
  teal: '#14B8A6',
  yellow: '#FACC15',
  indigo: '#6366F1',
};

const LIGHT_THEME = {
  background: '#fff',
  text: '#1F1F1F',
  sectionBackground: '#F3F4F6',
  primary: '#F44BF8',
  primaryLight: '#FCE7F3',
  tabIconColor: '#A1A1AA',
};

const DARK_THEME = {
  background: '#111017',
  text: '#fff',
  sectionBackground: '#1E1B2E',
  primary: '#F44BF8',
  primaryLight: '#3B0764',
  tabIconColor: '#A1A1AA',
};

type ThemeType = 'light' | 'dark';

interface ThemeState {
  activeTheme: ThemeType;
  accentColor: AccentColorId;
  isIncognito: boolean;
  themeColors: typeof LIGHT_THEME;
  setAccentColor: (color: AccentColorId) => void;
  toggleTheme: () => void;
  toggleIncognito: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  activeTheme: 'light',
  accentColor: 'purple',
  isIncognito: false,
  themeColors: { ...DARK_THEME, primary: ACCENT_COLOR_MAP['purple'], primaryLight: '#3B0764' },

  setAccentColor: (color) => {
    set((state) => ({
      accentColor: color,
      themeColors: {
        ...state.themeColors,
        primary: ACCENT_COLOR_MAP[color],
        primaryLight: color === 'purple' ? '#FCE7F3' : color === 'blue' ? '#DBEAFE' : color === 'orange' ? '#FFEDD5' : '#DCFCE7',
      },
    }));
    AsyncStorage.setItem('accentColor', color);
  },

  toggleTheme: () => {
    set((state) => {;
      const baseTheme = state.activeTheme === 'dark' ?  LIGHT_THEME : DARK_THEME;
      return {
        activeTheme: state.activeTheme === 'dark' ? 'light' : 'dark',
        themeColors: {
          ...baseTheme,
          primary: ACCENT_COLOR_MAP[state.accentColor],
          primaryLight: state.accentColor === 'purple' ? '#FCE7F3' : state.accentColor === 'blue' ? '#DBEAFE' : state.accentColor === 'orange' ? '#FFEDD5' : '#DCFCE7',
        },
      };
    });
    AsyncStorage.setItem('activeTheme', get().activeTheme === 'dark' ? 'dark' : 'light');
  },

  toggleIncognito: () => {
    set((state) => ({ isIncognito: !state.isIncognito }));
    AsyncStorage.setItem('isIncognito', (!get().isIncognito).toString());
  },

  hydrate: async () => {
    const storedTheme = await AsyncStorage.getItem('activeTheme');
    const storedAccent = await AsyncStorage.getItem('accentColor');
    const storedIncognito = await AsyncStorage.getItem('isIncognito');
    if (storedTheme === 'dark' || storedTheme === 'light') get().toggleTheme();
    if (storedAccent && ['purple', 'blue', 'orange', 'green'].includes(storedAccent))
      get().setAccentColor(storedAccent as AccentColorId);
    if (storedIncognito === 'true') set({ isIncognito: true });
  },
}));

export default useThemeStore;
