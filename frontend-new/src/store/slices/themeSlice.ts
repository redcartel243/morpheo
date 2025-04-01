import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types
export interface ThemeState {
  mode: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'normal' | 'comfortable';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

// Initial state
const initialState: ThemeState = {
  mode: 'light',
  fontSize: 'medium',
  spacing: 'normal',
  primaryColor: '#3b82f6', // Blue
  secondaryColor: '#10b981', // Green
  fontFamily: 'Inter, system-ui, sans-serif',
};

// Create slice
const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleThemeMode: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
    setThemeMode: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.mode = action.payload;
    },
    setFontSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
      state.fontSize = action.payload;
    },
    setSpacing: (state, action: PayloadAction<'compact' | 'normal' | 'comfortable'>) => {
      state.spacing = action.payload;
    },
    setPrimaryColor: (state, action: PayloadAction<string>) => {
      state.primaryColor = action.payload;
    },
    setSecondaryColor: (state, action: PayloadAction<string>) => {
      state.secondaryColor = action.payload;
    },
    setFontFamily: (state, action: PayloadAction<string>) => {
      state.fontFamily = action.payload;
    },
    setTheme: (state, action: PayloadAction<Partial<ThemeState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  toggleThemeMode,
  setThemeMode,
  setFontSize,
  setSpacing,
  setPrimaryColor,
  setSecondaryColor,
  setFontFamily,
  setTheme,
} = themeSlice.actions;

export default themeSlice.reducer; 