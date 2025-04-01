/**
 * Shared type definitions for the Morpheo component library
 */

// Base component props that all components should extend
export interface BaseComponentProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  hidden?: boolean;
  disabled?: boolean;
}

// Event handler types
export type EventHandler = (event: any) => void;

// Common event handler props
export interface EventHandlerProps {
  onClick?: EventHandler;
  onChange?: EventHandler;
  onFocus?: EventHandler;
  onBlur?: EventHandler;
  onKeyDown?: EventHandler;
  onKeyUp?: EventHandler;
  onMouseOver?: EventHandler;
  onMouseOut?: EventHandler;
}

// Element reference prop
export interface RefProps {
  ref?: React.RefObject<any>;
}

// Common style properties
export interface StyleProps {
  // Color properties
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  
  // Spacing properties - full names
  margin?: string | number;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  padding?: string | number;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  
  // Spacing properties - shorthand
  m?: string | number;
  mt?: string | number;
  mr?: string | number;
  mb?: string | number;
  ml?: string | number;
  mx?: string | number;
  my?: string | number;
  p?: string | number;
  pt?: string | number;
  pr?: string | number;
  pb?: string | number;
  pl?: string | number;
  px?: string | number;
  py?: string | number;
  
  // Typography properties
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  lineHeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  letterSpacing?: string | number;
  textDecoration?: string;
  
  // Border properties
  border?: string;
  borderWidth?: string | number;
  borderStyle?: string;
  borderRadius?: string | number;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  
  // Layout properties
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  
  // Display and position properties
  display?: 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'none';
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number;
  
  // Flex properties
  flex?: string | number;
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string | number;
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'stretch';
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  order?: number;
  
  // Grid properties
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridTemplateAreas?: string;
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  gridAutoFlow?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gap?: string | number;
  columnGap?: string | number;
  rowGap?: string | number;
  
  // Shadow
  boxShadow?: string;
  
  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
  
  // Opacity and visibility
  opacity?: number;
  visibility?: 'visible' | 'hidden' | 'collapse';
  
  // Cursor
  cursor?: string;
  
  // Transition and animation
  transition?: string;
  transform?: string;
  animation?: string;
  
  // Additional custom styles
  style?: React.CSSProperties;
}

// Size variants for components
export type SizeVariant = 'small' | 'medium' | 'large';

// Common variant props
export interface VariantProps {
  variant?: 'text' | 'outlined' | 'contained' | 'standard' | 'filled' | string;
  size?: SizeVariant;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default' | string;
  elevation?: number; // For components that can have shadow depth
  fullWidth?: boolean;
}

// Common theme props
export interface ThemeProps {
  theme?: Record<string, any>;
}

// Component children props
export interface ChildrenProps {
  children?: React.ReactNode;
}

// Data items for lists, select, etc.
export interface DataItem {
  id?: string | number;
  value?: any;
  label?: string;
  disabled?: boolean;
  selected?: boolean;
  [key: string]: any;
}

// Form element props
export interface FormElementProps {
  /** Form element name */
  name?: string;
  /** Form element value */
  value?: string | number | readonly string[] | undefined;
  /** Default value */
  defaultValue?: string | number | readonly string[] | undefined;
  /** Label for the form element */
  label?: React.ReactNode;
  /** Whether the element is required */
  required?: boolean;
  /** Whether the element is disabled */
  disabled?: boolean;
  /** Whether the element is read-only */
  readOnly?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text */
  helperText?: React.ReactNode;
  /** Error state or message */
  error?: boolean | string;
  /** onChange handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** onBlur handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** onFocus handler */
  onFocus?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

// Composite component props
export type ComponentProps = BaseComponentProps & 
  EventHandlerProps & 
  StyleProps & 
  VariantProps & 
  ThemeProps & 
  ChildrenProps & 
  RefProps; 