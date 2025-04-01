import React, { forwardRef } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { createTypographyStyles, classNames } from '../../theme/styled';
import Box from '../common/Box';
import { BaseComponentProps, StyleProps } from '../types';

/**
 * Text variants
 */
export type TextVariant = 
  | 'h1' 
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'overline';

/**
 * Text align options
 */
export type TextAlign = 
  | 'left'
  | 'center'
  | 'right'
  | 'justify';

/**
 * Text transform options
 */
export type TextTransform = 
  | 'none'
  | 'capitalize'
  | 'uppercase'
  | 'lowercase';

/**
 * Text component props
 */
export interface TextProps extends BaseComponentProps, StyleProps {
  /** Text variant */
  variant?: TextVariant;
  /** HTML element to render as */
  as?: React.ElementType;
  /** Text content */
  children?: React.ReactNode;
  /** Font weight */
  weight?: 'light' | 'regular' | 'medium' | 'bold' | number;
  /** Text color */
  color?: string;
  /** Text alignment */
  align?: TextAlign;
  /** Text transformation */
  transform?: TextTransform;
  /** Whether text should be truncated with ellipsis */
  truncate?: boolean;
  /** Maximum number of lines (requires truncate) */
  lines?: number;
  /** Whether the text should be italic */
  italic?: boolean;
  /** Whether text should be rendered with a line through it */
  strikethrough?: boolean;
  /** Whether text should be underlined */
  underline?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** onClick handler */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Text component for all typography needs
 */
export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      variant = 'body1',
      as,
      weight,
      color,
      align,
      transform,
      truncate = false,
      lines,
      italic = false,
      strikethrough = false,
      underline = false,
      children,
      className,
      style,
      onClick,
      testId,
      id,
      ...rest
    },
    ref
  ) => {
    const { theme } = useTheme();
    
    // Determine the HTML element to render based on variant or as prop
    const Component = as || getElementFromVariant(variant);
    
    // Create base typography styles based on variant
    const baseTypographyStyles = React.useMemo(() => {
      const sizeMap: Record<TextVariant, keyof typeof theme.typography.fontSize> = {
        h1: 'xxl',
        h2: 'xl',
        h3: 'lg',
        h4: 'md',
        h5: 'sm',
        h6: 'xs',
        subtitle1: 'md',
        subtitle2: 'sm',
        body1: 'md',
        body2: 'sm',
        caption: 'xs',
        overline: 'xs',
      };
      
      const weightMap: Record<TextVariant, keyof typeof theme.typography.fontWeight> = {
        h1: 'bold',
        h2: 'bold',
        h3: 'bold',
        h4: 'bold',
        h5: 'bold',
        h6: 'medium',
        subtitle1: 'medium',
        subtitle2: 'medium',
        body1: 'regular',
        body2: 'regular',
        caption: 'regular',
        overline: 'medium',
      };
      
      return createTypographyStyles(
        theme, 
        sizeMap[variant], 
        weight || weightMap[variant]
      );
    }, [theme, variant, weight]);
    
    // Combine base styles with prop-based styles
    const combinedStyles = React.useMemo(() => {
      const styles: React.CSSProperties = {
        ...baseTypographyStyles,
        textAlign: align,
        textTransform: transform,
        fontStyle: italic ? 'italic' : undefined,
        textDecoration: strikethrough 
          ? 'line-through' 
          : underline 
            ? 'underline' 
            : undefined,
        margin: 0, // Reset margin
      };
      
      // Handle color
      if (color) {
        const colorKey = color as keyof typeof theme.palette.colors;
        const colorObj = theme.palette.colors[colorKey];
        
        // Check if we got a valid color object back
        if (colorObj && typeof colorObj === 'object' && 'main' in colorObj) {
          styles.color = colorObj.main;
        } else {
          // Just use the color value as is (might be a named color or hex)
          styles.color = color;
        }
      }
      
      // Add truncation styles if needed
      if (truncate) {
        Object.assign(styles, {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: lines && lines > 1 ? '-webkit-box' : 'block',
          WebkitLineClamp: lines && lines > 1 ? lines : undefined,
          WebkitBoxOrient: lines && lines > 1 ? 'vertical' : undefined,
          whiteSpace: lines && lines > 1 ? 'normal' : 'nowrap',
        });
      }
      
      // Add custom style overrides
      if (style) {
        Object.assign(styles, style);
      }
      
      return styles;
    }, [
      baseTypographyStyles,
      color,
      align,
      transform,
      italic,
      strikethrough,
      underline,
      truncate,
      lines,
      style,
      theme
    ]);

    return (
      <Box
        as={Component}
        ref={ref}
        className={classNames(className)}
        style={combinedStyles}
        onClick={onClick}
        id={id}
        testId={testId}
        {...rest}
      >
        {children}
      </Box>
    );
  }
);

// Helper function to determine the element type from variant
function getElementFromVariant(variant: TextVariant): React.ElementType {
  switch (variant) {
    case 'h1': return 'h1';
    case 'h2': return 'h2';
    case 'h3': return 'h3';
    case 'h4': return 'h4';
    case 'h5': return 'h5';
    case 'h6': return 'h6';
    case 'subtitle1': return 'h6';
    case 'subtitle2': return 'h6';
    case 'body1': return 'p';
    case 'body2': return 'p';
    case 'caption': return 'span';
    case 'overline': return 'span';
    default: return 'span';
  }
}

Text.displayName = 'Text';

export default Text; 