import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { Theme, defaultTheme, darkTheme, createTheme } from './theme';

// Define the context type
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleThemeMode: () => void;
  isDarkMode: boolean;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  toggleThemeMode: () => {},
  isDarkMode: false,
});

// Hook for using the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ThemeProvider props
interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme | 'dark' | 'light';
}

// ThemeProvider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme = defaultTheme 
}) => {
  // Initialize theme based on the initialTheme prop
  const [theme, setThemeState] = useState<Theme>(() => {
    if (initialTheme === 'dark') {
      return darkTheme;
    } else if (initialTheme === 'light') {
      return defaultTheme;
    } else if (typeof initialTheme === 'object') {
      return createTheme(initialTheme);
    }
    return defaultTheme;
  });

  // Function to set the theme
  const setTheme = useCallback((newTheme: Theme | Partial<Theme>) => {
    if (typeof newTheme === 'object' && !('id' in newTheme)) {
      // It's a partial theme, merge it with the current theme
      setThemeState(prevTheme => createTheme({ ...prevTheme, ...newTheme }));
    } else {
      // It's a complete theme
      setThemeState(newTheme as Theme);
    }
  }, []);

  // Function to toggle between light and dark mode
  const toggleThemeMode = useCallback(() => {
    setThemeState(prevTheme => 
      prevTheme.palette.mode === 'light' ? darkTheme : defaultTheme
    );
  }, []);

  // Determine if dark mode is active
  const isDarkMode = useMemo(() => theme.palette.mode === 'dark', [theme]);

  // Create the context value
  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    toggleThemeMode,
    isDarkMode,
  }), [theme, setTheme, toggleThemeMode, isDarkMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 