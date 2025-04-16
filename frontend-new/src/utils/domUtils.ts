/**
 * DOM Manipulation Utilities for Morpheo
 * 
 * This file contains higher-level utilities that extend the $m selector API.
 * These utilities provide common functionality for formatting, validation,
 * animation, and safe evaluation of expressions.
 */

/**
 * Formats a number with specified precision
 * @param value - The number to format
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted number as string
 */
export function formatNumber(value: number | string, precision: number = 2): string {
  try {
    // Handle string inputs by converting to number
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number
    if (isNaN(num)) {
      console.warn('formatNumber received an invalid number:', value);
      return '0';
    }
    
    return num.toFixed(precision);
  } catch (error) {
    console.error('Error in formatNumber:', error);
    return '0';
  }
}

/**
 * Formats a date according to the specified format
 * @param date - The date to format (Date object, timestamp, or date string)
 * @param format - Format string (default: 'MM/DD/YYYY')
 * @param locale - Locale for formatting (default: system locale)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  format: string = 'MM/DD/YYYY',
  locale: string = navigator.language
): string {
  try {
    // Convert input to Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if it's a valid date
    if (isNaN(dateObj.getTime())) {
      console.warn('formatDate received an invalid date:', date);
      return '';
    }
    
    // If Intl.DateTimeFormat is available, use it for localization
    if (typeof Intl !== 'undefined') {
      // Map common format strings to Intl options
      let options: Intl.DateTimeFormatOptions = {};
      
      if (format === 'MM/DD/YYYY' || format === 'short') {
        options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      } else if (format === 'YYYY-MM-DD' || format === 'iso') {
        // ISO format using string manipulation
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else if (format === 'MMMM D, YYYY' || format === 'long') {
        options = { year: 'numeric', month: 'long', day: 'numeric' };
      } else if (format === 'MM/DD/YYYY HH:mm' || format === 'datetime') {
        options = { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        };
      } else if (format === 'relative') {
        // Relative time formatting (e.g., "2 days ago")
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
        
        if (diffInSeconds < 60) {
          return 'just now';
        } else if (diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60);
          return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
          const hours = Math.floor(diffInSeconds / 3600);
          return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 2592000) {
          const days = Math.floor(diffInSeconds / 86400);
          return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 31536000) {
          const months = Math.floor(diffInSeconds / 2592000);
          return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
          const years = Math.floor(diffInSeconds / 31536000);
          return `${years} year${years > 1 ? 's' : ''} ago`;
        }
      }
      
      // Use Intl.DateTimeFormat for localized formatting
      return new Intl.DateTimeFormat(locale, options).format(dateObj);
    } else {
      // Fallback if Intl is not available
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      if (format === 'YYYY-MM-DD' || format === 'iso') {
        return `${year}-${month}-${day}`;
      } else {
        // Default to MM/DD/YYYY
        return `${month}/${day}/${year}`;
      }
    }
  } catch (error) {
    console.error('Error in formatDate:', error);
    return '';
  }
}

/**
 * Formats a currency value
 * @param value - The number to format as currency
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: system locale)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string,
  currency: string = 'USD',
  locale: string = navigator.language
): string {
  try {
    // Convert string to number
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number
    if (isNaN(amount)) {
      console.warn('formatCurrency received an invalid number:', value);
      return '';
    }
    
    // Use Intl.NumberFormat if available
    if (typeof Intl !== 'undefined') {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } else {
      // Basic fallback
      return `${currency} ${amount.toFixed(2)}`;
    }
  } catch (error) {
    console.error('Error in formatCurrency:', error);
    return '';
  }
}

/**
 * Truncates text to specified length and adds ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - String to append to truncated text (default: '...')
 * @returns Truncated text with ellipsis
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  try {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // No need to truncate if text is shorter than maxLength
    if (text.length <= maxLength) {
      return text;
    }
    
    // Find the last space before maxLength to avoid breaking words
    const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
    
    // If no space found or it's too close to the beginning, cut at maxLength
    const cutoff = lastSpace > maxLength / 2 ? lastSpace : maxLength;
    
    return text.substring(0, cutoff) + ellipsis;
  } catch (error) {
    console.error('Error in truncateText:', error);
    return text;
  }
}

/**
 * Validates input based on type
 * @param value - The value to validate
 * @param type - Validation type ('number', 'email', 'phone', etc.)
 * @returns Object with isValid flag and optional error message
 */
export function validateInput(value: string, type: string): { isValid: boolean; message?: string } {
  if (value === undefined || value === null) {
    return { isValid: false, message: 'Value cannot be empty' };
  }

  const trimmedValue = typeof value === 'string' ? value.trim() : String(value);
  
  switch (type.toLowerCase()) {
    case 'number':
      // Check if it's a valid number
      if (!/^-?\d*\.?\d+$/.test(trimmedValue)) {
        return { isValid: false, message: 'Please enter a valid number' };
      }
      return { isValid: true };
      
    case 'integer':
      // Check if it's a valid integer
      if (!/^-?\d+$/.test(trimmedValue)) {
        return { isValid: false, message: 'Please enter a valid integer' };
      }
      return { isValid: true };
      
    case 'email':
      // Basic email validation
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmedValue)) {
        return { isValid: false, message: 'Please enter a valid email address' };
      }
      return { isValid: true };
      
    case 'phone':
      // Basic phone validation (allows various formats)
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(trimmedValue.replace(/\s/g, ''))) {
        return { isValid: false, message: 'Please enter a valid phone number' };
      }
      return { isValid: true };
      
    case 'date':
      // Check if it's a valid date
      const date = new Date(trimmedValue);
      if (isNaN(date.getTime())) {
        return { isValid: false, message: 'Please enter a valid date' };
      }
      return { isValid: true };
      
    case 'url':
      // Basic URL validation
      try {
        new URL(trimmedValue);
        return { isValid: true };
      } catch {
        return { isValid: false, message: 'Please enter a valid URL' };
      }
      
    case 'required':
      // Check if field is not empty
      if (trimmedValue === '') {
        return { isValid: false, message: 'This field is required' };
      }
      return { isValid: true };
      
    default:
      // Default to true if no specific validation type is provided
      return { isValid: true };
  }
}

/**
 * Applies standard animations to elements
 * @param element - Element or selector to animate
 * @param animation - Animation name ('fade', 'slide', 'bounce', etc.)
 * @param options - Optional configuration for the animation
 * @returns The animation object for chaining or control
 */
export function animateElement(
  element: string | HTMLElement, 
  animation: string,
  options: {
    duration?: number;
    delay?: number;
    iterations?: number;
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    easing?: string;
    fill?: 'none' | 'forwards' | 'backwards' | 'both';
  } = {}
): Animation | null {
  try {
    // Get the element if a selector was provided
    const el = typeof element === 'string' 
      ? document.getElementById(element.replace(/^#/, '')) 
      : element;
      
    if (!el) {
      console.warn('animateElement: Element not found', element);
      return null;
    }
    
    // Default animation options
    const defaultOptions = {
      duration: 300,
      easing: 'ease',
      fill: 'forwards' as const,
      ...options
    };
    
    // Define keyframes based on animation type
    let keyframes: Keyframe[] = [];
    
    switch (animation.toLowerCase()) {
      case 'fade-in':
        keyframes = [
          { opacity: 0 },
          { opacity: 1 }
        ];
        break;
        
      case 'fade-out':
        keyframes = [
          { opacity: 1 },
          { opacity: 0 }
        ];
        break;
        
      case 'slide-in':
        keyframes = [
          { transform: 'translateX(-20px)', opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 }
        ];
        break;
        
      case 'slide-out':
        keyframes = [
          { transform: 'translateX(0)', opacity: 1 },
          { transform: 'translateX(20px)', opacity: 0 }
        ];
        break;
        
      case 'zoom-in':
        keyframes = [
          { transform: 'scale(0.8)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 }
        ];
        break;
        
      case 'zoom-out':
        keyframes = [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.8)', opacity: 0 }
        ];
        break;
        
      case 'bounce':
        keyframes = [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-10px)' },
          { transform: 'translateY(0)' }
        ];
        break;
        
      case 'pulse':
        keyframes = [
          { transform: 'scale(1)' },
          { transform: 'scale(1.05)' },
          { transform: 'scale(1)' }
        ];
        break;
        
      case 'shake':
        keyframes = [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(5px)' },
          { transform: 'translateX(-5px)' },
          { transform: 'translateX(0)' }
        ];
        break;
        
      default:
        console.warn('animateElement: Unknown animation type', animation);
        return null;
    }
    
    // Apply the animation
    return el.animate(keyframes, defaultOptions);
  } catch (error) {
    console.error('Error in animateElement:', error);
    return null;
  }
}

/**
 * Safely evaluates mathematical and logical expressions
 * @param expression - The expression to evaluate
 * @returns The result of the evaluation or null if invalid
 */
export function safeEval(expression: string): any {
  try {
    // Trim whitespace
    const trimmedExpr = expression.trim();
    
    // Don't evaluate empty expressions
    if (!trimmedExpr) {
      return null;
    }
    
    // Check for potentially dangerous code patterns
    const dangerousPatterns = [
      /[^.]\s*document\s*\./i,
      /[^.]\s*window\s*\./i,
      /[^.]\s*localStorage\s*\./i,
      /[^.]\s*sessionStorage\s*\./i,
      /[^.]\s*cookie/i,
      /fetch\s*\(/i,
      /XMLHttpRequest/i,
      /\$\./i,
      /\$\(/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /new\s+Function/i,
      /import\s*\(/i,
      /require\s*\(/i,
      /location\s*\./i,
      /alert\s*\(/i,
      /confirm\s*\(/i,
      /prompt\s*\(/i,
      /\<script/i,
      /document\.write/i,
      /innerHTML/i,
      /outerHTML/i,
    ];
    
    // Check if the expression contains dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedExpr)) {
        console.error('Unsafe expression detected:', trimmedExpr);
        return null;
      }
    }
    
    // Allow only specific patterns for basic math & logic operations
    // This provides a basic sanitization layer
    // Only allow: numbers, basic operators, parentheses, and safe Math functions
    const safePattern = /^[\d\s\(\)\[\]\{\}\.\,\+\-\*\/\%\<\>\=\!\&\|\?\:\^]+$|^Math\.(abs|ceil|floor|round|max|min|pow|sqrt|cos|sin|tan|log|exp)\s*\(/i;
    
    const containsMathFunctions = /Math\.(abs|ceil|floor|round|max|min|pow|sqrt|cos|sin|tan|log|exp)\s*\(/i.test(trimmedExpr);
    
    if (!containsMathFunctions && !safePattern.test(trimmedExpr)) {
      console.error('Expression contains potentially unsafe operations:', trimmedExpr);
      return null;
    }
    
    // Use Function constructor with a restricted scope
    // This is safer than eval as it doesn't have access to the local scope
    const restrictedEval = new Function('Math', `"use strict"; return (${trimmedExpr});`);
    
    // Execute with only Math in scope
    return restrictedEval(Math);
  } catch (error) {
    console.error('Error evaluating expression:', error);
    return null;
  }
}

/**
 * Finds the closest parent element matching a selector
 * @param element - The starting element
 * @param selector - CSS selector to match against parents
 * @returns The closest matching parent or null if none found
 */
export function closest(
  element: string | HTMLElement, 
  selector: string
): HTMLElement | null {
  try {
    // Get the element if a selector was provided
    const el = typeof element === 'string'
      ? document.getElementById(element.replace(/^#/, ''))
      : element;
      
    if (!el) {
      console.warn('closest: Element not found', element);
      return null;
    }
    
    // Use native closest if available
    if (el.closest) {
      return el.closest(selector) as HTMLElement;
    }
    
    // Fallback implementation for older browsers
    const matches = (el: HTMLElement, sel: string) => {
      const matchesMethod = el.matches || el.webkitMatchesSelector || 
                           (el as any).mozMatchesSelector || (el as any).msMatchesSelector;
                           
      if (matchesMethod) {
        return matchesMethod.call(el, sel);
      }
      
      // Fallback for very old browsers
      const elements = document.querySelectorAll(sel);
      let i = elements.length;
      while (--i >= 0 && elements[i] !== el) {}
      return i > -1;
    };
    
    // Start with current element
    let currentEl: HTMLElement | null = el;
    
    // Check each parent
    while (currentEl && currentEl.nodeType === 1) {
      if (matches(currentEl, selector)) {
        return currentEl;
      }
      
      const parentElement: HTMLElement | null = currentEl.parentElement;
      if (!parentElement) {
        return null;
      }
      
      currentEl = parentElement;
    }
    
    return null;
  } catch (error) {
    console.error('Error in closest:', error);
    return null;
  }
}

/**
 * Gets all siblings of an element
 * @param element - The reference element
 * @param selector - Optional CSS selector to filter siblings
 * @returns Array of sibling elements
 */
export function siblings(
  element: string | HTMLElement, 
  selector?: string
): HTMLElement[] {
  try {
    // Get the element if a selector was provided
    const el = typeof element === 'string' 
      ? document.getElementById(element.replace(/^#/, '')) 
      : element;
      
    if (!el || !el.parentElement) {
      console.warn('siblings: Element not found or has no parent', element);
      return [];
    }
    
    // Get all children of the parent, excluding the element itself
    const siblings = Array.from(el.parentElement.children).filter(
      child => child !== el
    ) as HTMLElement[];
    
    // Apply selector filter if provided
    if (selector) {
      return siblings.filter(sibling => sibling.matches(selector));
    }
    
    return siblings;
  } catch (error) {
    console.error('Error in siblings:', error);
    return [];
  }
}

/**
 * Creates a new DOM element with attributes and content
 * @param tagName - The HTML tag name
 * @param attributes - Object containing attributes to set
 * @param content - Optional text content or child elements
 * @returns The created element
 */
export function create(
  tagName: string,
  attributes: Record<string, any> = {},
  content?: string | HTMLElement | HTMLElement[]
): HTMLElement {
  try {
    // Create the element
    const element = document.createElement(tagName);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'style' && typeof value === 'object') {
        // Handle style object
        Object.entries(value).forEach(([prop, val]) => {
          (element.style as any)[prop] = val;
        });
      } else if (key === 'class' || key === 'className') {
        // Handle classes
        element.className = value;
      } else if (key === 'dataset' && typeof value === 'object') {
        // Handle dataset attributes
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = String(dataValue);
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        // Handle event listeners
        const eventName = key.substring(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else {
        // Handle regular attributes
        element.setAttribute(key, value);
      }
    });
    
    // Add content
    if (content) {
      if (typeof content === 'string') {
        // Set text content
        element.textContent = content;
      } else if (Array.isArray(content)) {
        // Append multiple children
        content.forEach(child => element.appendChild(child));
      } else {
        // Append a single child
        element.appendChild(content);
      }
    }
    
    return element;
  } catch (error) {
    console.error('Error in create:', error);
    // Return an empty div as fallback
    return document.createElement('div');
  }
}

// Session storage for state management
const stateStorage: Record<string, any> = {};
const stateWatchers: Record<string, ((value: any) => void)[]> = {};

/**
 * Stores a value in memory state
 * @param key - The key to store the value under
 * @param value - The value to store
 * @returns The stored value
 */
export function storeValue(key: string, value: any): any {
  try {
    // Store the value
    stateStorage[key] = value;
    
    // Notify watchers
    if (stateWatchers[key]) {
      stateWatchers[key].forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error('Error in storeValue watcher callback:', error);
        }
      });
    }
    
    return value;
  } catch (error) {
    console.error('Error in storeValue:', error);
    return null;
  }
}

/**
 * Retrieves a value from memory state
 * @param key - The key to retrieve
 * @param defaultValue - Default value if key doesn't exist
 * @returns The stored value or default
 */
export function getValue(key: string, defaultValue: any = null): any {
  try {
    return key in stateStorage ? stateStorage[key] : defaultValue;
  } catch (error) {
    console.error('Error in getValue:', error);
    return defaultValue;
  }
}

/**
 * Watches for changes to a state value
 * @param key - The key to watch
 * @param callback - Function to call when value changes
 * @returns Function to stop watching
 */
export function watchValue(key: string, callback: (value: any) => void): () => void {
  try {
    // Initialize watchers array if needed
    if (!stateWatchers[key]) {
      stateWatchers[key] = [];
    }
    
    // Add the callback
    stateWatchers[key].push(callback);
    
    // Execute callback immediately with current value if available
    if (key in stateStorage) {
      try {
        callback(stateStorage[key]);
      } catch (error) {
        console.error('Error in immediate watchValue callback:', error);
      }
    }
    
    // Return function to remove the watcher
    return () => {
      try {
        if (stateWatchers[key]) {
          const index = stateWatchers[key].indexOf(callback);
          if (index !== -1) {
            stateWatchers[key].splice(index, 1);
          }
          
          // Clean up empty watcher arrays
          if (stateWatchers[key].length === 0) {
            delete stateWatchers[key];
          }
        }
      } catch (error) {
        console.error('Error removing watcher:', error);
      }
    };
  } catch (error) {
    console.error('Error in watchValue:', error);
    return () => {};
  }
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The string to sanitize
 * @param allowHtml - Whether to allow certain safe HTML tags (default: false)
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, allowHtml: boolean = false): string {
  if (input === undefined || input === null || typeof input !== 'string') {
    return '';
  }

  if (!allowHtml) {
    // Basic sanitization - escape HTML special characters
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } else {
    // Enhanced sanitization - allow certain safe HTML tags
    // Create a DOMParser instance
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    
    // Remove potentially dangerous elements and attributes
    const sanitize = (node: Element) => {
      // Remove script tags, inline event handlers, and other dangerous elements
      const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'base', 'form'];
      const dangerousAttrs = ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onchange', 'onsubmit', 'onfocus', 'onblur', 'javascript:'];
      
      // Remove dangerous tags
      dangerousTags.forEach(tag => {
        const elements = node.getElementsByTagName(tag);
        for (let i = elements.length - 1; i >= 0; i--) {
          elements[i].parentNode?.removeChild(elements[i]);
        }
      });
      
      // Process all elements to remove dangerous attributes
      const processAttributes = (element: Element) => {
        // Remove all attributes that start with "on" (event handlers)
        const attributes = element.attributes;
        const attributesToRemove = [];
        
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          if (attr.name.startsWith('on') || 
              dangerousAttrs.some(dangerous => attr.name.includes(dangerous)) ||
              (attr.name === 'href' && attr.value.startsWith('javascript:'))) {
            attributesToRemove.push(attr.name);
          }
        }
        
        attributesToRemove.forEach(attr => {
          element.removeAttribute(attr);
        });
        
        // Apply sanitization to all child elements
        Array.from(element.children).forEach(child => {
          processAttributes(child);
        });
      };
      
      processAttributes(node);
    };
    
    // Apply sanitization to the body
    sanitize(doc.body);
    
    // Return sanitized HTML
    return doc.body.innerHTML;
  }
} 