import React, { forwardRef } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { createStyles, classNames } from '../../theme/styled';
import { BaseComponentProps, StyleProps } from '../types';

/**
 * Box component props
 */
export interface BoxProps extends BaseComponentProps, StyleProps {
  /** The HTML element to render as */
  as?: React.ElementType;
  /** Custom class name */
  className?: string;
  /** Children elements */
  children?: React.ReactNode;
  /** HTML type attribute (for button, input, etc.) */
  type?: string;
  /** onClick event handler */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** onMouseEnter event handler */
  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  /** onMouseLeave event handler */
  onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
  /** onFocus event handler */
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  /** onBlur event handler */
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  /** onKeyDown event handler */
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  /** onKeyUp event handler */
  onKeyUp?: (event: React.KeyboardEvent<HTMLElement>) => void;
  /** Data attributes */
  [key: `data-${string}`]: string | number | boolean | undefined;
}

/**
 * Box component - base building block for UI composition
 * Used as the foundation for all other UI components
 */
export const Box = forwardRef<HTMLElement, BoxProps>(
  (
    {
      as: Component = 'div',
      children,
      className,
      id,
      testId,
      hidden,
      disabled,
      onClick,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      style,
      ...styleProps
    },
    ref
  ) => {
    const { theme } = useTheme();
    const styles = createStyles(theme, styleProps, style);

    return (
      <Component
        ref={ref}
        id={id}
        data-testid={testId}
        className={classNames(className)}
        style={styles}
        hidden={hidden}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        {children}
      </Component>
    );
  }
);

Box.displayName = 'Box';

export default Box; 