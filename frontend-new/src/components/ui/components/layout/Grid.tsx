import React, { forwardRef, useEffect, useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { createStyles, classNames } from '../../theme/styled';
import Box from '../common/Box';
import { BaseComponentProps, StyleProps } from '../types';

/**
 * Grid container alignment
 */
export type GridJustify = 
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

/**
 * Grid item alignment
 */
export type GridAlign = 
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'stretch'
  | 'baseline';

/**
 * Grid components props
 */
export interface GridProps extends BaseComponentProps, Omit<StyleProps, 'alignContent' | 'alignItems' | 'justifyContent'> {
  /** Whether this grid is a container */
  container?: boolean;
  /** Whether this grid is an item */
  item?: boolean;
  /** Grid direction */
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  /** Grid wrap behavior */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Horizontal alignment */
  justifyContent?: GridJustify;
  /** Vertical alignment */
  alignItems?: GridAlign;
  /** Alignment of content when wrapped */
  alignContent?: GridAlign;
  /** Grid spacing between items */
  spacing?: number | string;
  /** Column width (1-12) */
  xs?: number | 'auto';
  /** Column width on small screens (1-12) */
  sm?: number | 'auto';
  /** Column width on medium screens (1-12) */
  md?: number | 'auto';
  /** Column width on large screens (1-12) */
  lg?: number | 'auto';
  /** Column width on extra large screens (1-12) */
  xl?: number | 'auto';
  /** Width of the grid */
  width?: string | number;
  /** Height of the grid */
  height?: string | number;
  /** Custom class name */
  className?: string;
  /** CSS style overrides */
  style?: React.CSSProperties;
  /** Grid children */
  children?: React.ReactNode;
  /** Event handlers */
  onClick?: (event: React.MouseEvent) => void;
}

/**
 * Grid component for responsive layouts
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      container = false,
      item = false,
      direction = 'row',
      wrap = 'wrap',
      justifyContent,
      alignItems,
      alignContent,
      spacing = 0,
      xs,
      sm,
      md,
      lg,
      xl,
      width,
      height,
      className,
      style,
      children,
      onClick,
      testId,
      id,
      ...rest
    },
    ref
  ) => {
    const { theme } = useTheme();
    const [breakpoints, setBreakpoints] = useState({
      sm: false,
      md: false,
      lg: false,
      xl: false
    });
    
    // Set up media query listeners
    useEffect(() => {
      // Only run in browser environment
      if (typeof window === 'undefined') return;
      
      const mediaQueries = {
        sm: window.matchMedia(`(min-width: ${theme.breakpoints.sm}px)`),
        md: window.matchMedia(`(min-width: ${theme.breakpoints.md}px)`),
        lg: window.matchMedia(`(min-width: ${theme.breakpoints.lg}px)`),
        xl: window.matchMedia(`(min-width: ${theme.breakpoints.xl}px)`)
      };
      
      // Initial check
      setBreakpoints({
        sm: mediaQueries.sm.matches,
        md: mediaQueries.md.matches,
        lg: mediaQueries.lg.matches,
        xl: mediaQueries.xl.matches
      });
      
      // Event listeners for changes
      const handleSm = (e: MediaQueryListEvent) => 
        setBreakpoints(prev => ({ ...prev, sm: e.matches }));
      const handleMd = (e: MediaQueryListEvent) => 
        setBreakpoints(prev => ({ ...prev, md: e.matches }));
      const handleLg = (e: MediaQueryListEvent) => 
        setBreakpoints(prev => ({ ...prev, lg: e.matches }));
      const handleXl = (e: MediaQueryListEvent) => 
        setBreakpoints(prev => ({ ...prev, xl: e.matches }));
      
      // Add listeners
      mediaQueries.sm.addEventListener('change', handleSm);
      mediaQueries.md.addEventListener('change', handleMd);
      mediaQueries.lg.addEventListener('change', handleLg);
      mediaQueries.xl.addEventListener('change', handleXl);
      
      // Clean up
      return () => {
        mediaQueries.sm.removeEventListener('change', handleSm);
        mediaQueries.md.removeEventListener('change', handleMd);
        mediaQueries.lg.removeEventListener('change', handleLg);
        mediaQueries.xl.removeEventListener('change', handleXl);
      };
    }, [theme.breakpoints]);
    
    // Compute styles based on props
    const gridStyles = React.useMemo(() => {
      // Base styles
      const baseStyles: React.CSSProperties = {
        boxSizing: 'border-box',
      };
      
      // Container specific styles
      if (container) {
        Object.assign(baseStyles, {
          display: 'flex',
          flexWrap: wrap,
          flexDirection: direction,
          justifyContent,
          alignItems,
          alignContent,
          width: width || '100%',
          height: height || 'auto',
        });
        
        // Add spacing
        if (spacing) {
          const spacingValue = typeof spacing === 'number' 
            ? theme.spacing.unit * spacing
            : Number(spacing);
          
          Object.assign(baseStyles, {
            width: width || `calc(100% + ${spacingValue}px)`,
            margin: `0 -${spacingValue / 2}px`,
          });
        }
      }
      
      // Item specific styles
      if (item) {
        const spacingValue = typeof spacing === 'number' 
          ? theme.spacing.unit * spacing 
          : Number(spacing);
          
        Object.assign(baseStyles, {
          padding: spacing ? `0 ${spacingValue / 2}px` : undefined,
          width: width || 'auto',
          height: height || 'auto',
        });
        
        // Calculate breakpoint-specific width
        const calculateWidth = (value: number | 'auto' | undefined) => {
          if (!value) return undefined;
          if (value === 'auto') return 'auto';
          return `${Math.min(100, Math.max(0, (value) * (100 / 12)))}%`;
        };
        
        // Apply responsive widths
        if (xs !== undefined) {
          baseStyles.flexBasis = calculateWidth(xs);
          baseStyles.flexGrow = xs === 'auto' ? 1 : 0;
          baseStyles.maxWidth = xs === 'auto' ? 'auto' : calculateWidth(xs);
        }

        // Apply sm breakpoint styles
        if (sm !== undefined && breakpoints.sm) {
          baseStyles.flexBasis = calculateWidth(sm);
          baseStyles.flexGrow = sm === 'auto' ? 1 : 0;
          baseStyles.maxWidth = sm === 'auto' ? 'auto' : calculateWidth(sm);
        }
        
        // Apply md breakpoint styles
        if (md !== undefined && breakpoints.md) {
          baseStyles.flexBasis = calculateWidth(md);
          baseStyles.flexGrow = md === 'auto' ? 1 : 0;
          baseStyles.maxWidth = md === 'auto' ? 'auto' : calculateWidth(md);
        }
        
        // Apply lg breakpoint styles
        if (lg !== undefined && breakpoints.lg) {
          baseStyles.flexBasis = calculateWidth(lg);
          baseStyles.flexGrow = lg === 'auto' ? 1 : 0;
          baseStyles.maxWidth = lg === 'auto' ? 'auto' : calculateWidth(lg);
        }
        
        // Apply xl breakpoint styles
        if (xl !== undefined && breakpoints.xl) {
          baseStyles.flexBasis = calculateWidth(xl);
          baseStyles.flexGrow = xl === 'auto' ? 1 : 0;
          baseStyles.maxWidth = xl === 'auto' ? 'auto' : calculateWidth(xl);
        }
      }
      
      // Add custom styles
      if (style) {
        Object.assign(baseStyles, style);
      }
      
      return baseStyles;
    }, [
      container,
      item,
      direction,
      wrap,
      justifyContent,
      alignItems,
      alignContent,
      spacing,
      xs,
      sm,
      md,
      lg,
      xl,
      width,
      height,
      style,
      theme,
      breakpoints
    ]);

    return (
      <Box
        as="div"
        ref={ref}
        id={id}
        style={gridStyles}
        className={classNames(className)}
        onClick={onClick}
        testId={testId}
        {...rest}
      >
        {children}
      </Box>
    );
  }
);

Grid.displayName = 'Grid';

export default Grid; 