/**
 * Morpheo Theme System
 * 
 * This file defines the default theme and theming utilities
 * for the component library to ensure consistent styling.
 */

// Typography definitions
export interface Typography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    light: number;
    regular: number;
    medium: number;
    bold: number;
  };
  lineHeight: {
    none: number;
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
}

// Spacing definitions
export interface Spacing {
  unit: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

// Colors definitions
export interface Colors {
  primary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  success: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  error: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  warning: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  info: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  background: {
    default: string;
    paper: string;
    contrast: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    hint: string;
  };
  divider: string;
  overlay: string;
}

// Shadows definitions
export interface Shadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

// Border radius definitions
export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  pill: string;
  circle: string;
}

// Breakpoints for responsive design
export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

// Transitions for animations
export interface Transitions {
  duration: {
    shortest: number;
    shorter: number;
    short: number;
    standard: number;
    complex: number;
    entering: number;
    leaving: number;
  };
  easing: {
    easeInOut: string;
    easeOut: string;
    easeIn: string;
    sharp: string;
  };
}

// Z-index values
export interface ZIndex {
  mobileStepper: number;
  appBar: number;
  drawer: number;
  modal: number;
  snackbar: number;
  tooltip: number;
  popover: number;
}

// Complete theme definition
export interface Theme {
  id: string;
  name: string;
  palette: {
    mode: 'light' | 'dark';
    colors: Colors;
  };
  typography: Typography;
  spacing: Spacing;
  shadows: Shadows;
  borderRadius: BorderRadius;
  breakpoints: Breakpoints;
  transitions: Transitions;
  zIndex: ZIndex;
}

// Default theme values
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default Theme',
  palette: {
    mode: 'light',
    colors: {
      primary: {
        main: '#3f51b5',
        light: '#757de8',
        dark: '#002984',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#f50057',
        light: '#ff5983',
        dark: '#bb002f',
        contrastText: '#ffffff',
      },
      success: {
        main: '#4caf50',
        light: '#80e27e',
        dark: '#087f23',
        contrastText: '#ffffff',
      },
      error: {
        main: '#f44336',
        light: '#ff7961',
        dark: '#ba000d',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#ff9800',
        light: '#ffc947',
        dark: '#c66900',
        contrastText: '#000000',
      },
      info: {
        main: '#2196f3',
        light: '#6ec6ff',
        dark: '#0069c0',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
        contrast: '#1a1a1a',
      },
      text: {
        primary: '#212121',
        secondary: '#757575',
        disabled: '#9e9e9e',
        hint: '#9e9e9e',
      },
      divider: '#e0e0e0',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    fontSize: {
      xs: '0.75rem',  // 12px
      sm: '0.875rem', // 14px
      md: '1rem',     // 16px
      lg: '1.25rem',  // 20px
      xl: '1.5rem',   // 24px
      xxl: '2rem',    // 32px
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  spacing: {
    unit: 8,
    xs: 4,     // 4px
    sm: 8,     // 8px
    md: 16,    // 16px
    lg: 24,    // 24px
    xl: 32,    // 32px
    xxl: 48,   // 48px
  },
  shadows: {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)',
    md: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
    lg: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
    xl: '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)',
  },
  borderRadius: {
    none: '0',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    pill: '9999px',
    circle: '50%',
  },
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      entering: 225,
      leaving: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
  zIndex: {
    mobileStepper: 1000,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
    popover: 1600,
  },
};

// Dark theme variant
export const darkTheme: Theme = {
  ...defaultTheme,
  id: 'dark',
  name: 'Dark Theme',
  palette: {
    ...defaultTheme.palette,
    mode: 'dark',
    colors: {
      ...defaultTheme.palette.colors,
      background: {
        default: '#121212',
        paper: '#1e1e1e',
        contrast: '#f5f5f5',
      },
      text: {
        primary: '#ffffff',
        secondary: '#b0b0b0',
        disabled: '#6c6c6c',
        hint: '#6c6c6c',
      },
      divider: '#424242',
    },
  },
};

// Theme utility functions
export const getThemeValue = (theme: Theme, path: string, defaultValue?: any): any => {
  const parts = path.split('.');
  let value: any = theme;
  
  for (const part of parts) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    value = value[part];
  }
  
  return value !== undefined ? value : defaultValue;
};

export const getColorValue = (theme: Theme, color: string, variant: string = 'main'): string => {
  if (color.startsWith('#') || color.startsWith('rgb')) {
    return color;
  }

  const colorKey = color as keyof typeof theme.palette.colors;
  const colorObj = theme.palette.colors[colorKey];
  
  // Check if we have a valid color object
  if (colorObj && typeof colorObj === 'object') {
    // Check if the color object has the requested variant
    if (variant in colorObj) {
      return (colorObj as any)[variant];
    }
    
    // Check if it has a main property as fallback
    if ('main' in colorObj) {
      return (colorObj as any).main;
    }
  }
  
  // If all else fails, return the color value as is
  return color;
};

export const getSpacing = (theme: Theme, spacingKey: string | number): string => {
  if (typeof spacingKey === 'number') {
    return `${spacingKey * theme.spacing.unit}px`;
  }
  
  if (typeof spacingKey === 'string') {
    if (spacingKey.endsWith('px') || spacingKey.endsWith('%') || spacingKey.endsWith('rem') || spacingKey.endsWith('em')) {
      return spacingKey;
    }
    
    const spacing = theme.spacing[spacingKey as keyof Spacing];
    return spacing !== undefined ? `${spacing}px` : spacingKey;
  }
  
  return `${theme.spacing.md}px`;
};

export const getBorderRadius = (theme: Theme, radius: string | number): string => {
  if (typeof radius === 'number') {
    return `${radius}px`;
  }
  
  if (typeof radius === 'string') {
    if (radius.endsWith('px') || radius.endsWith('%') || radius.endsWith('rem') || radius.endsWith('em')) {
      return radius;
    }
    
    return theme.borderRadius[radius as keyof BorderRadius] || radius;
  }
  
  return theme.borderRadius.md;
};

export const getShadow = (theme: Theme, shadowKey: string | number): string => {
  if (typeof shadowKey === 'number') {
    return theme.shadows[`md`];
  }
  
  return theme.shadows[shadowKey as keyof Shadows] || 'none';
};

// Function to merge theme overrides with the default theme
export const createTheme = (overrides: Partial<Theme> = {}): Theme => {
  return {
    ...defaultTheme,
    ...overrides,
    palette: {
      ...defaultTheme.palette,
      ...(overrides.palette || {}),
      colors: {
        ...defaultTheme.palette.colors,
        ...(overrides.palette?.colors || {}),
      },
    },
    typography: {
      ...defaultTheme.typography,
      ...(overrides.typography || {}),
    },
    spacing: {
      ...defaultTheme.spacing,
      ...(overrides.spacing || {}),
    },
    shadows: {
      ...defaultTheme.shadows,
      ...(overrides.shadows || {}),
    },
    borderRadius: {
      ...defaultTheme.borderRadius,
      ...(overrides.borderRadius || {}),
    },
    breakpoints: {
      ...defaultTheme.breakpoints,
      ...(overrides.breakpoints || {}),
    },
    transitions: {
      ...defaultTheme.transitions,
      ...(overrides.transitions || {}),
    },
    zIndex: {
      ...defaultTheme.zIndex,
      ...(overrides.zIndex || {}),
    },
  };
}; 