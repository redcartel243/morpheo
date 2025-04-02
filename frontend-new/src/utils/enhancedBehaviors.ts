/**
 * Enhanced Behaviors for Morpheo
 * 
 * This file contains smart default behaviors for components,
 * including automatic validation, standard interactions, 
 * and error prevention mechanisms.
 */

import { validateInput } from './domUtils';
import { sanitizeInput } from './domUtils';

/**
 * Type-Based Validation for Input Elements
 * Automatically validates input based on its type attribute
 * 
 * @param inputElement - The input element to enhance
 * @returns Function to remove the enhancements
 */
export function enhanceInputValidation(inputElement: string | HTMLInputElement): () => void {
  try {
    // Get the element if a selector was provided
    const element = typeof inputElement === 'string' 
      ? document.getElementById(inputElement.replace(/^#/, '')) as HTMLInputElement
      : inputElement;
      
    if (!element || !['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
      console.warn('enhanceInputValidation: Invalid element', inputElement);
      return () => {};
    }
    
    // Determine validation type based on input attributes
    let validationType = 'text';
    
    if (element.tagName === 'INPUT') {
      // Get the input type
      const inputType = element.type.toLowerCase();
      
      // Map HTML input types to validation types
      switch (inputType) {
        case 'number':
        case 'range':
          validationType = 'number';
          break;
        case 'email':
          validationType = 'email';
          break;
        case 'tel':
          validationType = 'phone';
          break;
        case 'url':
          validationType = 'url';
          break;
        case 'date':
        case 'datetime-local':
        case 'month':
        case 'week':
        case 'time':
          validationType = 'date';
          break;
        default:
          validationType = inputType;
      }
    }
    
    // Check if the field is required
    const isRequired = element.hasAttribute('required');
    if (isRequired) {
      validationType = validationType + ',required';
    }
    
    // Create validation function
    const validateField = () => {
      // Get current value
      const value = element.value;
      
      // Validate based on determined type
      const validationTypes = validationType.split(',');
      let isValid = true;
      let message = '';
      
      // Validate against each type
      for (const type of validationTypes) {
        if (!type) continue;
        
        const result = validateInput(value, type);
        if (!result.isValid) {
          isValid = false;
          message = result.message || 'Invalid input';
          break;
        }
      }
      
      // Apply validation styling
      if (!isValid) {
        element.classList.add('invalid');
        element.classList.remove('valid');
        
        // If there's no existing error message element, create one
        let errorElement = element.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains('error-message')) {
          errorElement = document.createElement('div');
          errorElement.classList.add('error-message');
          (errorElement as HTMLElement).style.color = 'red';
          (errorElement as HTMLElement).style.fontSize = '0.8rem';
          (errorElement as HTMLElement).style.marginTop = '0.2rem';
          element.parentNode?.insertBefore(errorElement, element.nextSibling);
        }
        
        // Set error message
        errorElement.textContent = message;
      } else {
        element.classList.add('valid');
        element.classList.remove('invalid');
        
        // Remove any existing error message
        const errorElement = element.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
          errorElement.textContent = '';
        }
      }
      
      return isValid;
    };
    
    // Add validation event listeners
    const blurHandler = () => validateField();
    const inputHandler = (e: Event) => {
      // Remove error styling while typing
      element.classList.remove('invalid');
      
      // Optional: live validation as user types
      // validateField();
      
      // Remove error message while typing
      const errorElement = element.nextElementSibling;
      if (errorElement && errorElement.classList.contains('error-message')) {
        errorElement.textContent = '';
      }
    };
    
    // Add event listeners
    element.addEventListener('blur', blurHandler);
    element.addEventListener('input', inputHandler);
    
    // Add validation method to the element
    (element as any).validate = validateField;
    
    // Return function to remove enhancements
    return () => {
      element.removeEventListener('blur', blurHandler);
      element.removeEventListener('input', inputHandler);
      delete (element as any).validate;
    };
  } catch (error) {
    console.error('Error in enhanceInputValidation:', error);
    return () => {};
  }
}

/**
 * Standard Interaction Behaviors for Buttons
 * Adds hover effects, loading states, and other standard interactions
 * 
 * @param buttonElement - The button element to enhance
 * @param options - Configuration options for button behaviors
 * @returns Function to remove the enhancements
 */
export function enhanceButtonBehavior(
  buttonElement: string | HTMLButtonElement,
  options: {
    hoverEffect?: boolean;
    loadingState?: boolean;
    disableOnClick?: boolean;
    clickAnimation?: boolean;
  } = {}
): () => void {
  try {
    // Default options
    const defaultOptions = {
      hoverEffect: true,
      loadingState: true,
      disableOnClick: false,
      clickAnimation: true,
      ...options
    };
    
    // Get the element if a selector was provided
    const element = typeof buttonElement === 'string' 
      ? document.getElementById(buttonElement.replace(/^#/, '')) as HTMLButtonElement
      : buttonElement;
      
    if (!element || (element.tagName !== 'BUTTON' && !element.classList.contains('btn'))) {
      console.warn('enhanceButtonBehavior: Invalid button element', buttonElement);
      return () => {};
    }
    
    // Store original styles
    const originalStyles = {
      boxShadow: element.style.boxShadow,
      transform: element.style.transform,
      transition: element.style.transition
    };
    
    // Set base transition for smooth effects
    element.style.transition = 'all 0.2s ease';
    
    // Event handlers
    const hoverInHandler = () => {
      if (defaultOptions.hoverEffect && !element.disabled) {
        element.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        element.style.transform = 'translateY(-1px)';
      }
    };
    
    const hoverOutHandler = () => {
      if (defaultOptions.hoverEffect) {
        element.style.boxShadow = originalStyles.boxShadow;
        element.style.transform = originalStyles.transform;
      }
    };
    
    // Loading state management
    let isLoading = false;
    let originalContent = '';
    
    // Loading state handler
    const setLoading = (loading: boolean) => {
      if (!defaultOptions.loadingState) return;
      
      if (loading && !isLoading) {
        // Save original content
        originalContent = element.innerHTML;
        
        // Create and add spinner
        const spinner = document.createElement('span');
        spinner.classList.add('button-spinner');
        spinner.style.display = 'inline-block';
        spinner.style.width = '1em';
        spinner.style.height = '1em';
        spinner.style.borderRadius = '50%';
        spinner.style.border = '2px solid rgba(255,255,255,0.3)';
        spinner.style.borderTopColor = '#fff';
        spinner.style.animation = 'button-spin 0.8s linear infinite';
        spinner.style.marginRight = '0.5em';
        
        // Add keyframes if they don't exist
        if (!document.getElementById('button-spinner-keyframes')) {
          const style = document.createElement('style');
          style.id = 'button-spinner-keyframes';
          style.textContent = `
            @keyframes button-spin {
              to { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Replace content with spinner and "Loading..." text
        element.innerHTML = '';
        element.appendChild(spinner);
        element.appendChild(document.createTextNode(' Loading...'));
        
        // Disable the button
        element.disabled = true;
        
        isLoading = true;
      } else if (!loading && isLoading) {
        // Restore original content
        element.innerHTML = originalContent;
        
        // Re-enable the button
        element.disabled = false;
        
        isLoading = false;
      }
    };
    
    // Click animation
    const clickHandler = (e: MouseEvent) => {
      if (defaultOptions.clickAnimation && !element.disabled) {
        // Add pulse effect
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
          element.style.transform = originalStyles.transform;
        }, 100);
      }
      
      if (defaultOptions.disableOnClick && !isLoading) {
        setLoading(true);
      }
    };
    
    // Add event listeners
    element.addEventListener('mouseenter', hoverInHandler);
    element.addEventListener('mouseleave', hoverOutHandler);
    element.addEventListener('click', clickHandler);
    
    // Add methods to the button element
    (element as any).setLoading = setLoading;
    
    // Return function to remove enhancements
    return () => {
      element.removeEventListener('mouseenter', hoverInHandler);
      element.removeEventListener('mouseleave', hoverOutHandler);
      element.removeEventListener('click', clickHandler);
      
      // Restore original styles
      element.style.boxShadow = originalStyles.boxShadow;
      element.style.transform = originalStyles.transform;
      element.style.transition = originalStyles.transition;
      
      // If in loading state, restore original content
      if (isLoading) {
        element.innerHTML = originalContent;
        element.disabled = false;
      }
      
      // Remove added methods
      delete (element as any).setLoading;
    };
  } catch (error) {
    console.error('Error in enhanceButtonBehavior:', error);
    return () => {};
  }
}

/**
 * Responsive Container Behavior
 * Makes containers responsive to viewport changes and content
 * 
 * @param containerElement - The container element to enhance
 * @param options - Configuration options for responsive behavior
 * @returns Function to remove the enhancements
 */
export function enhanceResponsiveContainer(
  containerElement: string | HTMLElement,
  options: {
    minWidth?: string;
    maxWidth?: string;
    adaptToContent?: boolean;
    breakpoints?: { [key: string]: string };
  } = {}
): () => void {
  try {
    // Default options
    const defaultOptions = {
      minWidth: '300px',
      maxWidth: '100%',
      adaptToContent: true,
      breakpoints: {
        sm: '576px',
        md: '768px',
        lg: '992px',
        xl: '1200px'
      },
      ...options
    };
    
    // Get the element if a selector was provided
    const element = typeof containerElement === 'string' 
      ? document.getElementById(containerElement.replace(/^#/, '')) as HTMLElement
      : containerElement;
      
    if (!element) {
      console.warn('enhanceResponsiveContainer: Invalid container element', containerElement);
      return () => {};
    }
    
    // Store original styles
    const originalStyles = {
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      width: element.style.width,
      overflow: element.style.overflow
    };
    
    // Apply initial responsive styles
    element.style.minWidth = defaultOptions.minWidth;
    element.style.maxWidth = defaultOptions.maxWidth;
    element.style.width = '100%';
    
    if (defaultOptions.adaptToContent) {
      element.style.overflow = 'auto';
    }
    
    // Create media query handler
    const applyBreakpointStyles = () => {
      const viewportWidth = window.innerWidth;
      
      // Apply styles based on breakpoints
      if (viewportWidth < parseInt(defaultOptions.breakpoints.sm)) {
        // Mobile styles
        element.classList.add('container-sm');
        element.classList.remove('container-md', 'container-lg', 'container-xl');
      } else if (viewportWidth < parseInt(defaultOptions.breakpoints.md)) {
        // Small tablet styles
        element.classList.add('container-md');
        element.classList.remove('container-sm', 'container-lg', 'container-xl');
      } else if (viewportWidth < parseInt(defaultOptions.breakpoints.lg)) {
        // Large tablet styles
        element.classList.add('container-lg');
        element.classList.remove('container-sm', 'container-md', 'container-xl');
      } else {
        // Desktop styles
        element.classList.add('container-xl');
        element.classList.remove('container-sm', 'container-md', 'container-lg');
      }
    };
    
    // Apply initial breakpoint styles
    applyBreakpointStyles();
    
    // Add resize listener
    window.addEventListener('resize', applyBreakpointStyles);
    
    // Return function to remove enhancements
    return () => {
      window.removeEventListener('resize', applyBreakpointStyles);
      
      // Restore original styles
      element.style.minWidth = originalStyles.minWidth;
      element.style.maxWidth = originalStyles.maxWidth;
      element.style.width = originalStyles.width;
      element.style.overflow = originalStyles.overflow;
      
      // Remove added classes
      element.classList.remove('container-sm', 'container-md', 'container-lg', 'container-xl');
    };
  } catch (error) {
    console.error('Error in enhanceResponsiveContainer:', error);
    return () => {};
  }
}

/**
 * Create a safe event handler that catches errors
 * @param handler - The original event handler
 * @param fallback - Optional fallback function to call if an error occurs
 * @returns A new event handler that catches errors
 */
export function createSafeEventHandler<T extends Event>(
  handler: (event: T, ...args: any[]) => any,
  fallback?: (error: Error, event: T, ...args: any[]) => any
): (event: T, ...args: any[]) => any {
  return (event: T, ...args: any[]) => {
    try {
      return handler(event, ...args);
    } catch (error) {
      console.error('Error in event handler:', error);
      
      // Call fallback if provided
      if (typeof fallback === 'function') {
        return fallback(error as Error, event, ...args);
      }
      
      // Prevent default browser action
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      
      // Stop propagation
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      
      return false;
    }
  };
}

/**
 * Automatically sanitize input in an input element
 * @param inputElement - The input element to sanitize
 * @returns Function to remove the auto-sanitization
 */
export function enableAutoSanitization(inputElement: string | HTMLInputElement): () => void {
  try {
    // Get the element if a selector was provided
    const element = typeof inputElement === 'string' 
      ? document.getElementById(inputElement.replace(/^#/, '')) as HTMLInputElement
      : inputElement;
      
    if (!element || !['INPUT', 'TEXTAREA'].includes(element.tagName)) {
      console.warn('enableAutoSanitization: Invalid element', inputElement);
      return () => {};
    }
    
    // Create input handler for sanitization
    const inputHandler = () => {
      const sanitized = sanitizeInput(element.value);
      
      // Only update if the value actually changed
      if (sanitized !== element.value) {
        element.value = sanitized;
      }
    };
    
    // Add event listener
    element.addEventListener('input', inputHandler);
    
    // Return function to remove sanitization
    return () => {
      element.removeEventListener('input', inputHandler);
    };
  } catch (error) {
    console.error('Error in enableAutoSanitization:', error);
    return () => {};
  }
} 