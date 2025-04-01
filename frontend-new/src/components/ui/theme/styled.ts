import { CSSProperties } from 'react';
import { Theme, getColorValue, getSpacing, getBorderRadius, getShadow } from './theme';
import { StyleProps } from '../components/types';

/**
 * Helper functions to generate CSS styles from theme and component props
 */

// Convert camelCase to kebab-case
const toKebabCase = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

// Process CSS properties object into valid CSS
export const processStyles = (
  styles: Record<string, any>,
  important = false
): CSSProperties => {
  const result: Record<string, any> = {};

  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      result[key] = important ? `${value} !important` : value;
    }
  });

  return result as CSSProperties;
};

// Create styles for the theme's typography variants
export const createTypographyStyles = (
  theme: Theme,
  variant = 'md',
  fontWeight?: string | number
): CSSProperties => {
  const fontSizeKey = variant as keyof typeof theme.typography.fontSize;
  const fontSize = theme.typography.fontSize[fontSizeKey] || theme.typography.fontSize.md;
  
  let weight: number;
  if (typeof fontWeight === 'string') {
    const weightKey = fontWeight as keyof typeof theme.typography.fontWeight;
    weight = theme.typography.fontWeight[weightKey] || theme.typography.fontWeight.regular;
  } else {
    weight = fontWeight as number || theme.typography.fontWeight.regular;
  }

  return {
    fontFamily: theme.typography.fontFamily,
    fontSize,
    fontWeight: weight,
    lineHeight: theme.typography.lineHeight.normal,
  };
};

// Main function to create styles from StyleProps and theme
export const createStyles = (
  theme: Theme,
  props: Partial<StyleProps> = {},
  baseStyles: CSSProperties = {}
): CSSProperties => {
  const styles: Record<string, any> = { ...baseStyles };

  // Process color properties
  if (props.color) {
    styles.color = getColorValue(theme, props.color);
  }
  if (props.backgroundColor) {
    styles.backgroundColor = getColorValue(theme, props.backgroundColor);
  }
  if (props.borderColor) {
    styles.borderColor = getColorValue(theme, props.borderColor);
  }

  // Process spacing properties
  const spacingProps: Array<keyof StyleProps> = [
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  ];

  spacingProps.forEach((prop) => {
    if (props[prop] !== undefined) {
      styles[prop] = getSpacing(theme, props[prop] as string | number);
    }
  });

  // Process shorthand margin and padding
  if (props.m) {
    styles.margin = getSpacing(theme, props.m);
  }
  if (props.mt) {
    styles.marginTop = getSpacing(theme, props.mt);
  }
  if (props.mr) {
    styles.marginRight = getSpacing(theme, props.mr);
  }
  if (props.mb) {
    styles.marginBottom = getSpacing(theme, props.mb);
  }
  if (props.ml) {
    styles.marginLeft = getSpacing(theme, props.ml);
  }
  if (props.mx) {
    styles.marginLeft = getSpacing(theme, props.mx);
    styles.marginRight = getSpacing(theme, props.mx);
  }
  if (props.my) {
    styles.marginTop = getSpacing(theme, props.my);
    styles.marginBottom = getSpacing(theme, props.my);
  }

  if (props.p) {
    styles.padding = getSpacing(theme, props.p);
  }
  if (props.pt) {
    styles.paddingTop = getSpacing(theme, props.pt);
  }
  if (props.pr) {
    styles.paddingRight = getSpacing(theme, props.pr);
  }
  if (props.pb) {
    styles.paddingBottom = getSpacing(theme, props.pb);
  }
  if (props.pl) {
    styles.paddingLeft = getSpacing(theme, props.pl);
  }
  if (props.px) {
    styles.paddingLeft = getSpacing(theme, props.px);
    styles.paddingRight = getSpacing(theme, props.px);
  }
  if (props.py) {
    styles.paddingTop = getSpacing(theme, props.py);
    styles.paddingBottom = getSpacing(theme, props.py);
  }

  // Process typography
  if (props.fontSize) {
    const fontSizeKey = props.fontSize as keyof typeof theme.typography.fontSize;
    styles.fontSize = theme.typography.fontSize[fontSizeKey] || props.fontSize;
  }
  if (props.fontWeight) {
    const fontWeightKey = props.fontWeight as keyof typeof theme.typography.fontWeight;
    styles.fontWeight = theme.typography.fontWeight[fontWeightKey] || props.fontWeight;
  }
  if (props.lineHeight) {
    const lineHeightKey = props.lineHeight as keyof typeof theme.typography.lineHeight;
    styles.lineHeight = theme.typography.lineHeight[lineHeightKey] || props.lineHeight;
  }
  if (props.fontFamily) {
    styles.fontFamily = props.fontFamily;
  }
  if (props.textAlign) {
    styles.textAlign = props.textAlign;
  }
  if (props.textTransform) {
    styles.textTransform = props.textTransform;
  }
  if (props.letterSpacing) {
    styles.letterSpacing = props.letterSpacing;
  }
  if (props.textDecoration) {
    styles.textDecoration = props.textDecoration;
  }

  // Process border properties
  if (props.border) {
    styles.border = props.border;
  }
  if (props.borderWidth) {
    styles.borderWidth = props.borderWidth;
  }
  if (props.borderStyle) {
    styles.borderStyle = props.borderStyle;
  }
  if (props.borderRadius) {
    styles.borderRadius = getBorderRadius(theme, props.borderRadius);
  }
  if (props.borderTop) {
    styles.borderTop = props.borderTop;
  }
  if (props.borderRight) {
    styles.borderRight = props.borderRight;
  }
  if (props.borderBottom) {
    styles.borderBottom = props.borderBottom;
  }
  if (props.borderLeft) {
    styles.borderLeft = props.borderLeft;
  }

  // Process layout properties
  if (props.width) {
    styles.width = props.width;
  }
  if (props.height) {
    styles.height = props.height;
  }
  if (props.minWidth) {
    styles.minWidth = props.minWidth;
  }
  if (props.maxWidth) {
    styles.maxWidth = props.maxWidth;
  }
  if (props.minHeight) {
    styles.minHeight = props.minHeight;
  }
  if (props.maxHeight) {
    styles.maxHeight = props.maxHeight;
  }

  // Process display and position properties
  if (props.display) {
    styles.display = props.display;
  }
  if (props.position) {
    styles.position = props.position;
  }
  if (props.top !== undefined) {
    styles.top = props.top;
  }
  if (props.right !== undefined) {
    styles.right = props.right;
  }
  if (props.bottom !== undefined) {
    styles.bottom = props.bottom;
  }
  if (props.left !== undefined) {
    styles.left = props.left;
  }
  if (props.zIndex !== undefined) {
    styles.zIndex = props.zIndex;
  }

  // Process flex properties
  if (props.flex) {
    styles.flex = props.flex;
  }
  if (props.flexDirection) {
    styles.flexDirection = props.flexDirection;
  }
  if (props.flexWrap) {
    styles.flexWrap = props.flexWrap;
  }
  if (props.flexGrow !== undefined) {
    styles.flexGrow = props.flexGrow;
  }
  if (props.flexShrink !== undefined) {
    styles.flexShrink = props.flexShrink;
  }
  if (props.flexBasis) {
    styles.flexBasis = props.flexBasis;
  }
  if (props.justifyContent) {
    styles.justifyContent = props.justifyContent;
  }
  if (props.alignItems) {
    styles.alignItems = props.alignItems;
  }
  if (props.alignContent) {
    styles.alignContent = props.alignContent;
  }
  if (props.alignSelf) {
    styles.alignSelf = props.alignSelf;
  }
  if (props.order) {
    styles.order = props.order;
  }

  // Process grid properties
  if (props.gridTemplateColumns) {
    styles.gridTemplateColumns = props.gridTemplateColumns;
  }
  if (props.gridTemplateRows) {
    styles.gridTemplateRows = props.gridTemplateRows;
  }
  if (props.gridTemplateAreas) {
    styles.gridTemplateAreas = props.gridTemplateAreas;
  }
  if (props.gridColumn) {
    styles.gridColumn = props.gridColumn;
  }
  if (props.gridRow) {
    styles.gridRow = props.gridRow;
  }
  if (props.gridArea) {
    styles.gridArea = props.gridArea;
  }
  if (props.gridAutoFlow) {
    styles.gridAutoFlow = props.gridAutoFlow;
  }
  if (props.gridAutoColumns) {
    styles.gridAutoColumns = props.gridAutoColumns;
  }
  if (props.gridAutoRows) {
    styles.gridAutoRows = props.gridAutoRows;
  }
  if (props.gap) {
    styles.gap = getSpacing(theme, props.gap);
  }
  if (props.columnGap) {
    styles.columnGap = getSpacing(theme, props.columnGap);
  }
  if (props.rowGap) {
    styles.rowGap = getSpacing(theme, props.rowGap);
  }

  // Process shadow
  if (props.boxShadow) {
    styles.boxShadow = getShadow(theme, props.boxShadow);
  }

  // Process overflow
  if (props.overflow) {
    styles.overflow = props.overflow;
  }
  if (props.overflowX) {
    styles.overflowX = props.overflowX;
  }
  if (props.overflowY) {
    styles.overflowY = props.overflowY;
  }

  // Process opacity
  if (props.opacity !== undefined) {
    styles.opacity = props.opacity;
  }

  // Process visibility
  if (props.visibility) {
    styles.visibility = props.visibility;
  }

  // Process cursor
  if (props.cursor) {
    styles.cursor = props.cursor;
  }

  // Process transition
  if (props.transition) {
    styles.transition = props.transition;
  }

  // Process transform
  if (props.transform) {
    styles.transform = props.transform;
  }

  // Process animation
  if (props.animation) {
    styles.animation = props.animation;
  }

  // Pass-through any other custom styles
  if (props.style) {
    Object.assign(styles, props.style);
  }

  return styles as CSSProperties;
};

// Generate a className string from multiple className inputs
export const classNames = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Create a variant style based on theme and variant name
export const createVariantStyles = (
  theme: Theme,
  component: string,
  variant: string = 'default'
): CSSProperties => {
  // This is a placeholder implementation
  // In a real implementation, you would have a mapping of component variants
  // to their corresponding styles
  return {};
};

export default {
  createStyles,
  createTypographyStyles,
  createVariantStyles,
  processStyles,
  classNames,
}; 