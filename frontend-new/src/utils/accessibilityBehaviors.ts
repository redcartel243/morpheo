/**
 * Accessibility Behaviors for Morpheo
 * 
 * This file contains utilities to enhance accessibility features,
 * including keyboard navigation, ARIA attributes, and color contrast.
 */

/**
 * Enhances keyboard navigation within a container
 * @param containerElement - The container element to enhance
 * @param options - Configuration options
 * @returns Function to remove the enhancements
 */
export function enhanceTabIndex(
  containerElement: string | HTMLElement,
  options: {
    selector?: string;
    wrap?: boolean;
    onSelect?: (element: HTMLElement) => void;
    focusClass?: string;
  } = {}
): () => void {
  try {
    // Default options
    const defaultOptions = {
      selector: 'a, button, input, select, textarea, [tabindex]',
      wrap: true,
      onSelect: null,
      focusClass: 'keyboard-focus',
      ...options
    };
    
    // Get the element if a selector was provided
    const container = typeof containerElement === 'string'
      ? document.getElementById(containerElement.replace(/^#/, ''))
      : containerElement;
      
    if (!container) {
      console.warn('enhanceTabIndex: Container not found', containerElement);
      return () => {};
    }
    
    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const elements = Array.from(container.querySelectorAll(defaultOptions.selector));
      
      return elements
        .filter((el) => {
          // Cast element to HTMLElement to use its properties
          const htmlEl = el as HTMLElement;
          
          // Only include visible, enabled, and navigable elements
          const tabIndex = htmlEl.getAttribute('tabindex');
          const isDisabled = htmlEl.hasAttribute('disabled') || 
                           htmlEl.getAttribute('aria-disabled') === 'true';
          const isHidden = htmlEl.getAttribute('aria-hidden') === 'true' || 
                         htmlEl.style.display === 'none' || 
                         htmlEl.style.visibility === 'hidden';
                           
          // Check if the element is visible and interactive
          return !isDisabled && !isHidden && (
            htmlEl.tagName === 'A' ||
            htmlEl.tagName === 'BUTTON' ||
            htmlEl.tagName === 'INPUT' ||
            htmlEl.tagName === 'SELECT' ||
            htmlEl.tagName === 'TEXTAREA' ||
            tabIndex !== '-1'
          );
        }) as HTMLElement[];
    };
    
    // Keyboard navigation handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      // Only include directly focusable elements in this container
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;
      
      // Find currently focused element
      const focusedElement = document.activeElement as HTMLElement;
      const focusedIndex = focusableElements.indexOf(focusedElement);
      
      // Handle focus wrapping or blocking if we're at boundaries
      if (defaultOptions.wrap) {
        if (e.shiftKey && focusedIndex === 0) {
          // Wrap to end when shift+tab on first element
          e.preventDefault();
          const lastElement = focusableElements[focusableElements.length - 1];
          lastElement.focus();
          
          // Call select callback if provided
          if (typeof defaultOptions.onSelect === 'function') {
            defaultOptions.onSelect(lastElement);
          }
        } else if (!e.shiftKey && focusedIndex === focusableElements.length - 1) {
          // Wrap to beginning when tab on last element
          e.preventDefault();
          const firstElement = focusableElements[0];
          firstElement.focus();
          
          // Call select callback if provided
          if (typeof defaultOptions.onSelect === 'function') {
            defaultOptions.onSelect(firstElement);
          }
        }
      }
    };
    
    // Add keyboard focus indicator
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target && (e.target as HTMLElement).classList) {
        (e.target as HTMLElement).classList.add(defaultOptions.focusClass);
      }
    };
    
    const handleFocusOut = (e: FocusEvent) => {
      if (e.target && (e.target as HTMLElement).classList) {
        (e.target as HTMLElement).classList.remove(defaultOptions.focusClass);
      }
    };
    
    // Add event listeners to container
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
      
      // Remove focus class from any elements that might still have it
      const focusedElements = container.querySelectorAll(`.${defaultOptions.focusClass}`);
      focusedElements.forEach(el => {
        el.classList.remove(defaultOptions.focusClass);
      });
    };
  } catch (error) {
    console.error('Error in enhanceTabIndex:', error);
    return () => {};
  }
}

/**
 * Adds appropriate ARIA attributes based on element type
 * @param element - The element to enhance
 * @param options - Additional attributes to set
 * @returns Function to remove the attributes
 */
export function enhanceAriaAttributes(
  element: string | HTMLElement,
  options: {
    role?: string;
    label?: string;
    description?: string;
    live?: 'off' | 'polite' | 'assertive';
    controls?: string;
    expanded?: boolean;
    haspopup?: boolean;
    checked?: boolean;
    selected?: boolean;
    disabled?: boolean;
    required?: boolean;
    readonly?: boolean;
    hidden?: boolean;
    [key: string]: any;
  } = {}
): () => void {
  try {
    // Get the element if a selector was provided
    const el = typeof element === 'string'
      ? document.getElementById(element.replace(/^#/, ''))
      : element;
      
    if (!el) {
      console.warn('enhanceAriaAttributes: Element not found', element);
      return () => {};
    }
    
    // Store original attributes to restore later
    const originalAttributes: Record<string, string | null> = {};
    
    // Determine appropriate ARIA attributes based on element type
    const tagName = el.tagName.toLowerCase();
    const type = el.getAttribute('type');
    
    // Default attributes based on element type
    const defaultAttributes: Record<string, any> = {};
    
    switch (tagName) {
      case 'button':
        defaultAttributes.role = 'button';
        break;
        
      case 'a':
        if (!el.hasAttribute('href')) {
          defaultAttributes.role = 'link';
        }
        break;
        
      case 'input':
        if (type === 'checkbox') {
          defaultAttributes.role = 'checkbox';
          defaultAttributes['aria-checked'] = (el as HTMLInputElement).checked;
        } else if (type === 'radio') {
          defaultAttributes.role = 'radio';
          defaultAttributes['aria-checked'] = (el as HTMLInputElement).checked;
        } else if (type === 'search') {
          defaultAttributes.role = 'searchbox';
        } else if (type === 'range') {
          defaultAttributes.role = 'slider';
          defaultAttributes['aria-valuemin'] = el.getAttribute('min') || '0';
          defaultAttributes['aria-valuemax'] = el.getAttribute('max') || '100';
          defaultAttributes['aria-valuenow'] = (el as HTMLInputElement).value;
        }
        break;
        
      case 'select':
        defaultAttributes.role = 'combobox';
        defaultAttributes['aria-expanded'] = 'false';
        break;
        
      case 'textarea':
        defaultAttributes.role = 'textbox';
        defaultAttributes['aria-multiline'] = 'true';
        break;
        
      case 'img':
        if (!el.hasAttribute('alt')) {
          defaultAttributes['aria-hidden'] = 'true';
        }
        break;
        
      case 'nav':
        defaultAttributes.role = 'navigation';
        break;
        
      case 'main':
        defaultAttributes.role = 'main';
        break;
        
      case 'header':
        defaultAttributes.role = 'banner';
        break;
        
      case 'footer':
        defaultAttributes.role = 'contentinfo';
        break;
        
      case 'aside':
        defaultAttributes.role = 'complementary';
        break;
        
      case 'section':
        defaultAttributes.role = 'region';
        break;
        
      case 'article':
        defaultAttributes.role = 'article';
        break;
        
      case 'dialog':
        defaultAttributes.role = 'dialog';
        defaultAttributes['aria-modal'] = 'true';
        break;
    }
    
    // Merge with options provided by the user
    const attributes = { ...defaultAttributes, ...options };
    
    // Map special attributes to ARIA attributes
    if (attributes.label !== undefined) {
      attributes['aria-label'] = attributes.label;
      delete attributes.label;
    }
    
    if (attributes.description !== undefined) {
      attributes['aria-description'] = attributes.description;
      delete attributes.description;
    }
    
    if (attributes.live !== undefined) {
      attributes['aria-live'] = attributes.live;
      delete attributes.live;
    }
    
    if (attributes.controls !== undefined) {
      attributes['aria-controls'] = attributes.controls;
      delete attributes.controls;
    }
    
    if (attributes.expanded !== undefined) {
      attributes['aria-expanded'] = attributes.expanded.toString();
      delete attributes.expanded;
    }
    
    if (attributes.haspopup !== undefined) {
      attributes['aria-haspopup'] = attributes.haspopup.toString();
      delete attributes.haspopup;
    }
    
    if (attributes.checked !== undefined) {
      attributes['aria-checked'] = attributes.checked.toString();
      delete attributes.checked;
    }
    
    if (attributes.selected !== undefined) {
      attributes['aria-selected'] = attributes.selected.toString();
      delete attributes.selected;
    }
    
    if (attributes.disabled !== undefined) {
      attributes['aria-disabled'] = attributes.disabled.toString();
      delete attributes.disabled;
    }
    
    if (attributes.required !== undefined) {
      attributes['aria-required'] = attributes.required.toString();
      delete attributes.required;
    }
    
    if (attributes.readonly !== undefined) {
      attributes['aria-readonly'] = attributes.readonly.toString();
      delete attributes.readonly;
    }
    
    if (attributes.hidden !== undefined) {
      attributes['aria-hidden'] = attributes.hidden.toString();
      delete attributes.hidden;
    }
    
    // Apply all attributes
    Object.entries(attributes).forEach(([key, value]) => {
      // Save original value
      originalAttributes[key] = el.getAttribute(key);
      
      // Set new value
      if (value === null || value === undefined) {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, String(value));
      }
    });
    
    // Return cleanup function
    return () => {
      // Restore original attributes
      Object.entries(originalAttributes).forEach(([key, value]) => {
        if (value === null) {
          el.removeAttribute(key);
        } else {
          el.setAttribute(key, value);
        }
      });
    };
  } catch (error) {
    console.error('Error in enhanceAriaAttributes:', error);
    return () => {};
  }
}

/**
 * Luminance calculation for color contrast
 */
function getLuminance(color: string): number {
  // Parse color (supports hex, rgb, rgba)
  let r: number, g: number, b: number;
  
  // Check for hex format
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    
    // Handle shorthand hex (#abc)
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }
  } else if (color.startsWith('rgb')) {
    // Handle rgb/rgba format
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    
    if (match) {
      r = parseInt(match[1]) / 255;
      g = parseInt(match[2]) / 255;
      b = parseInt(match[3]) / 255;
    } else {
      return 0; // Invalid format
    }
  } else {
    return 0; // Unsupported format
  }
  
  // Apply gamma correction
  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  // Determine lighter and darker colors
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  // Calculate contrast ratio: (L1 + 0.05) / (L2 + 0.05)
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Enhances text color contrast for better readability
 * @param element - The element to enhance
 * @param options - Configuration options
 * @returns Function to remove the enhancements
 */
export function enhanceColorContrast(
  element: string | HTMLElement,
  options: {
    minContrast?: number;
    preferredTextColor?: string;
    preferredBackgroundColor?: string;
    includeChildren?: boolean;
  } = {}
): () => void {
  try {
    // Default options
    const defaultOptions = {
      minContrast: 4.5, // WCAG AA standard for normal text
      preferredTextColor: null,
      preferredBackgroundColor: null,
      includeChildren: true,
      ...options
    };
    
    // Get the element if a selector was provided
    const el = typeof element === 'string'
      ? document.getElementById(element.replace(/^#/, ''))
      : element;
      
    if (!el) {
      console.warn('enhanceColorContrast: Element not found', element);
      return () => {};
    }
    
    // Store original colors to restore later
    interface ColorData {
      element: HTMLElement;
      originalColor: string;
      originalBackgroundColor: string;
    }
    
    const originalColors: ColorData[] = [];
    
    // Function to enhance contrast for a single element
    const enhanceElementContrast = (element: HTMLElement) => {
      // Get computed styles
      const computedStyle = window.getComputedStyle(element);
      const textColor = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      // Save original colors
      originalColors.push({
        element,
        originalColor: textColor,
        originalBackgroundColor: backgroundColor
      });
      
      // If background is transparent, find parent background
      let effectiveBackground = backgroundColor;
      if (effectiveBackground === 'rgba(0, 0, 0, 0)' || effectiveBackground === 'transparent') {
        let parent = element.parentElement;
        while (parent) {
          const parentBg = window.getComputedStyle(parent).backgroundColor;
          if (parentBg !== 'rgba(0, 0, 0, 0)' && parentBg !== 'transparent') {
            effectiveBackground = parentBg;
            break;
          }
          parent = parent.parentElement;
        }
        
        // If no background found, assume white
        if (effectiveBackground === 'rgba(0, 0, 0, 0)' || effectiveBackground === 'transparent') {
          effectiveBackground = 'rgb(255, 255, 255)';
        }
      }
      
      // Calculate current contrast
      const currentContrast = getContrastRatio(textColor, effectiveBackground);
      
      // If contrast is already sufficient, do nothing
      if (currentContrast >= defaultOptions.minContrast) {
        return;
      }
      
      // Determine which color to adjust
      if (defaultOptions.preferredTextColor) {
        // Use preferred text color
        element.style.color = defaultOptions.preferredTextColor;
      } else if (defaultOptions.preferredBackgroundColor) {
        // Use preferred background color
        element.style.backgroundColor = defaultOptions.preferredBackgroundColor;
      } else {
        // Auto-adjust text color based on background luminance
        const bgLuminance = getLuminance(effectiveBackground);
        
        if (bgLuminance > 0.5) {
          // Dark text on light background
          element.style.color = '#000000';
        } else {
          // Light text on dark background
          element.style.color = '#ffffff';
        }
      }
    };
    
    // Process element and children if needed
    if (defaultOptions.includeChildren) {
      // Get all text elements (including the parent)
      const textElements = [el, ...Array.from(el.querySelectorAll('*'))].filter(element => {
        // Only include elements that contain text and are visible
        const computedStyle = window.getComputedStyle(element as HTMLElement);
        return element.textContent && 
               element.textContent.trim() !== '' && 
               computedStyle.display !== 'none' && 
               computedStyle.visibility !== 'hidden';
      }) as HTMLElement[];
      
      // Enhance contrast for each element
      textElements.forEach(enhanceElementContrast);
    } else {
      // Just enhance the target element
      enhanceElementContrast(el);
    }
    
    // Return cleanup function
    return () => {
      // Restore original colors
      originalColors.forEach(({ element, originalColor, originalBackgroundColor }) => {
        element.style.color = originalColor;
        element.style.backgroundColor = originalBackgroundColor;
      });
    };
  } catch (error) {
    console.error('Error in enhanceColorContrast:', error);
    return () => {};
  }
} 