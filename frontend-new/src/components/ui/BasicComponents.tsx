import React, { ReactNode } from 'react';

interface ContainerProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  onClick?: () => void;
}

export const Container: React.FC<ContainerProps> = ({ 
  className = '', 
  style = {}, 
  children,
  onClick
}) => {
  return (
    <div className={className} style={style} onClick={onClick}>
      {children}
    </div>
  );
};

interface TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  content?: string;
}

export const Text: React.FC<TextProps> = (props) => {
  const { 
    variant = 'p', 
    className = '',
    style = {}, 
    children,
    content
  } = props || {};
  
  const displayContent = children || content || '';
  
  const safeVariant = variant || 'p';
  
  switch (safeVariant) {
    case 'h1':
      return <h1 className={className} style={style}>{displayContent}</h1>;
    case 'h2':
      return <h2 className={className} style={style}>{displayContent}</h2>;
    case 'h3':
      return <h3 className={className} style={style}>{displayContent}</h3>;
    case 'h4':
      return <h4 className={className} style={style}>{displayContent}</h4>;
    case 'h5':
      return <h5 className={className} style={style}>{displayContent}</h5>;
    case 'h6':
      return <h6 className={className} style={style}>{displayContent}</h6>;
    case 'span':
      return <span className={className} style={style}>{displayContent}</span>;
    case 'p':
    default:
      return <p className={className} style={style}>{displayContent}</p>;
  }
};

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'text';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

export const Button: React.FC<ButtonProps> = (props) => {
  const {
    variant = 'primary',
    className = '',
    style = {},
    onClick,
    disabled = false,
    children
  } = props || {};
  
  const baseStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    border: 'none',
    transition: 'all 0.2s ease',
    ...style
  };
  
  let variantStyle: React.CSSProperties = {};
  
  switch (variant) {
    case 'primary':
      variantStyle = {
        backgroundColor: '#3498db',
        color: 'white',
      };
      break;
    case 'secondary':
      variantStyle = {
        backgroundColor: '#f0f0f0',
        color: '#333',
        border: '1px solid #ddd'
      };
      break;
    case 'text':
      variantStyle = {
        backgroundColor: 'transparent',
        color: '#3498db',
        padding: '4px 8px'
      };
      break;
  }
  
  return (
    <button
      className={className}
      style={{ ...baseStyle, ...variantStyle }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}; 
 
 
 
 