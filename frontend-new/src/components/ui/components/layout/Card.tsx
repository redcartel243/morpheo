import React, { forwardRef } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { createStyles, classNames } from '../../theme/styled';
import Box from '../common/Box';
import Text from '../basic/Text';
import { BaseComponentProps, StyleProps } from '../types';

/**
 * Card component interface
 */
export interface CardProps extends BaseComponentProps, StyleProps {
  /** Card title */
  title?: React.ReactNode;
  /** Card subtitle */
  subtitle?: React.ReactNode;
  /** Card content */
  children?: React.ReactNode;
  /** Card footer */
  footer?: React.ReactNode;
  /** Whether to show a divider between header and content */
  headerDivider?: boolean;
  /** Whether to show a divider between content and footer */
  footerDivider?: boolean;
  /** Elevation level (shadow depth) */
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Border radius size */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether the card is outlined */
  outlined?: boolean;
  /** Whether the card is clickable */
  clickable?: boolean;
  /** Whether the card is a container that doesn't have padding */
  container?: boolean;
  /** Custom class name */
  className?: string;
  /** onClick event handler */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** onMouseEnter event handler */
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** onMouseLeave event handler */
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Card component
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      subtitle,
      children,
      footer,
      headerDivider = false,
      footerDivider = false,
      elevation = 'md',
      radius = 'md',
      outlined = false,
      clickable = false,
      container = false,
      className,
      onClick,
      onMouseEnter,
      onMouseLeave,
      id,
      testId,
      style,
      ...rest
    },
    ref
  ) => {
    const { theme } = useTheme();
    
    // Compute card styles
    const cardStyles = React.useMemo(() => {
      const baseStyles: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.colors.background.paper,
        borderRadius: theme.borderRadius[radius],
        boxShadow: outlined ? 'none' : theme.shadows[elevation],
        border: outlined ? `1px solid ${theme.palette.colors.divider}` : 'none',
        overflow: 'hidden',
        transition: `box-shadow 300ms ${theme.transitions.easing.easeInOut}, 
                    transform 300ms ${theme.transitions.easing.easeInOut}`,
        cursor: clickable ? 'pointer' : 'default',
      };
      
      if (clickable) {
        Object.assign(baseStyles, {
          ':hover': {
            boxShadow: theme.shadows.lg,
            transform: 'translateY(-2px)',
          },
          ':active': {
            transform: 'translateY(0)',
          },
        });
      }
      
      // Apply custom styles
      if (style) {
        Object.assign(baseStyles, style);
      }
      
      return baseStyles;
    }, [elevation, radius, outlined, clickable, style, theme]);
    
    // Card header markup
    const renderHeader = () => {
      if (!title && !subtitle) return null;
      
      return (
        <>
          <div
            style={{
              padding: container ? 0 : `${theme.spacing.md}px ${theme.spacing.lg}px`,
              paddingBottom: headerDivider || !children ? undefined : theme.spacing.sm,
            }}
          >
            {title && (
              <div style={{ marginBottom: subtitle ? theme.spacing.xs : 0 }}>
                {typeof title === 'string' ? (
                  <Text variant="h5" color="text.primary">
                    {title}
                  </Text>
                ) : (
                  title
                )}
              </div>
            )}
            
            {subtitle && (
              <div>
                {typeof subtitle === 'string' ? (
                  <Text variant="body2" color="text.secondary">
                    {subtitle}
                  </Text>
                ) : (
                  subtitle
                )}
              </div>
            )}
          </div>
          
          {headerDivider && (
            <div
              style={{
                height: 1,
                backgroundColor: theme.palette.colors.divider,
                margin: 0,
              }}
            />
          )}
        </>
      );
    };
    
    // Card content markup
    const renderContent = () => {
      if (!children) return null;
      
      return (
        <div
          style={{
            padding: container 
              ? 0 
              : `${title || subtitle ? theme.spacing.sm : theme.spacing.md}px ${theme.spacing.lg}px`,
            paddingBottom: footer ? theme.spacing.sm : theme.spacing.md,
            flex: 1,
          }}
        >
          {children}
        </div>
      );
    };
    
    // Card footer markup
    const renderFooter = () => {
      if (!footer) return null;
      
      return (
        <>
          {footerDivider && (
            <div
              style={{
                height: 1,
                backgroundColor: theme.palette.colors.divider,
                margin: 0,
              }}
            />
          )}
          
          <div
            style={{
              padding: container ? 0 : `${theme.spacing.sm}px ${theme.spacing.lg}px`,
              paddingTop: footerDivider ? theme.spacing.md : theme.spacing.sm,
            }}
          >
            {footer}
          </div>
        </>
      );
    };

    return (
      <Box
        as="div"
        ref={ref}
        id={id}
        className={classNames(className)}
        style={cardStyles}
        onClick={onClick as any}
        onMouseEnter={onMouseEnter as any}
        onMouseLeave={onMouseLeave as any}
        testId={testId}
        {...rest}
      >
        {renderHeader()}
        {renderContent()}
        {renderFooter()}
      </Box>
    );
  }
);

Card.displayName = 'Card';

export default Card; 