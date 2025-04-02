/**
 * Form Management Behaviors for Morpheo
 * 
 * This file contains smart default behaviors for form elements,
 * including validation, submission handling, and serialization.
 */

import { sanitizeInput, validateInput } from './domUtils';
import { enhanceInputValidation } from './enhancedBehaviors';

/**
 * Enhances an entire form with validation, submission handling, and serialization
 * @param formElement - The form element to enhance
 * @param options - Configuration options
 * @returns Object with form utilities and cleanup function
 */
export function enhanceForm(
  formElement: string | HTMLFormElement,
  options: {
    validateOnSubmit?: boolean;
    validateOnChange?: boolean;
    preventDefaultSubmit?: boolean;
    sanitizeInput?: boolean;
    submitCallback?: (data: Record<string, any>, form: HTMLFormElement) => Promise<any> | any;
    successCallback?: (response: any, form: HTMLFormElement) => void;
    errorCallback?: (error: any, form: HTMLFormElement) => void;
  } = {}
): { 
  validate: () => boolean; 
  getValues: () => Record<string, any>; 
  setValues: (values: Record<string, any>) => void;
  reset: () => void;
  submit: () => Promise<any>;
  cleanup: () => void;
} {
  try {
    // Default options
    const defaultOptions = {
      validateOnSubmit: true,
      validateOnChange: false,
      preventDefaultSubmit: true,
      sanitizeInput: true,
      ...options
    };
    
    // Get the element if a selector was provided
    const form = typeof formElement === 'string'
      ? document.getElementById(formElement.replace(/^#/, '')) as HTMLFormElement
      : formElement;
      
    if (!form || form.tagName !== 'FORM') {
      console.warn('enhanceForm: Invalid form element', formElement);
      // Return no-op functions as a fallback
      return {
        validate: () => false,
        getValues: () => ({}),
        setValues: () => {},
        reset: () => {},
        submit: () => Promise.reject(new Error('Invalid form element')),
        cleanup: () => {}
      };
    }
    
    // Track enhanced inputs to enable cleanup
    const enhancedInputs: Array<() => void> = [];
    const eventHandlers: Array<[HTMLElement, string, EventListener]> = [];
    
    // Enhance all form inputs with validation
    const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
    inputs.forEach(input => {
      const removeEnhancement = enhanceInputValidation(input as HTMLInputElement);
      enhancedInputs.push(removeEnhancement);
    });
    
    // Validate the entire form
    const validateForm = (): boolean => {
      let isValid = true;
      
      // Validate each input
      inputs.forEach(input => {
        const inputElement = input as HTMLInputElement;
        
        // Skip disabled fields or submit buttons
        if (inputElement.disabled || inputElement.type === 'submit' || inputElement.type === 'button') {
          return;
        }
        
        // Use the validate method added by enhanceInputValidation
        if ((inputElement as any).validate) {
          const fieldValid = (inputElement as any).validate();
          isValid = isValid && fieldValid;
        }
      });
      
      return isValid;
    };
    
    // Get all form values as an object
    const getFormValues = (): Record<string, any> => {
      const values: Record<string, any> = {};
      
      inputs.forEach(input => {
        const inputElement = input as HTMLInputElement;
        
        // Skip buttons, fieldsets, and disabled inputs
        if (inputElement.type === 'button' || 
            inputElement.type === 'submit' || 
            inputElement.type === 'reset' || 
            inputElement.tagName === 'FIELDSET' ||
            inputElement.disabled) {
          return;
        }
        
        // Get the field name (use id if name not available)
        const fieldName = inputElement.name || inputElement.id;
        if (!fieldName) return;
        
        // Handle different input types
        if (inputElement.type === 'checkbox') {
          values[fieldName] = inputElement.checked;
        } else if (inputElement.type === 'radio') {
          if (inputElement.checked) {
            values[fieldName] = inputElement.value;
          }
        } else if (inputElement.type === 'file') {
          values[fieldName] = inputElement.files;
        } else if (inputElement.type === 'select-multiple' && inputElement.tagName === 'SELECT') {
          // Check that this is actually a SELECT element before casting
          values[fieldName] = Array.from((inputElement as unknown as HTMLSelectElement).selectedOptions)
            .map(option => option.value);
        } else {
          let value = inputElement.value;
          
          // Sanitize input if enabled
          if (defaultOptions.sanitizeInput && typeof value === 'string') {
            value = sanitizeInput(value);
          }
          
          // Convert value to appropriate type if possible
          if (inputElement.type === 'number' || inputElement.dataset.type === 'number') {
            values[fieldName] = value === '' ? null : Number(value);
          } else if (inputElement.type === 'date' || inputElement.dataset.type === 'date') {
            values[fieldName] = value === '' ? null : new Date(value);
          } else {
            values[fieldName] = value;
          }
        }
      });
      
      return values;
    };
    
    // Set form values from an object
    const setFormValues = (values: Record<string, any>): void => {
      if (!values || typeof values !== 'object') return;
      
      // Set each field's value
      Object.entries(values).forEach(([key, value]) => {
        // Find elements by name or id
        const elements = form.querySelectorAll(`[name="${key}"], #${key}`);
        
        if (elements.length === 0) return;
        
        elements.forEach(element => {
          const inputElement = element as HTMLInputElement;
          
          // Handle different input types
          if (inputElement.type === 'checkbox') {
            inputElement.checked = !!value;
          } else if (inputElement.type === 'radio') {
            inputElement.checked = inputElement.value === String(value);
          } else if (inputElement.tagName === 'SELECT' && Array.isArray(value)) {
            // Handle multi-select
            const selectElement = inputElement as unknown as HTMLSelectElement;
            Array.from(selectElement.options).forEach(option => {
              option.selected = value.includes(option.value);
            });
          } else {
            // Format value based on input type
            if (inputElement.type === 'date' && value instanceof Date) {
              // Format date as YYYY-MM-DD for date inputs
              const year = value.getFullYear();
              const month = String(value.getMonth() + 1).padStart(2, '0');
              const day = String(value.getDate()).padStart(2, '0');
              inputElement.value = `${year}-${month}-${day}`;
            } else {
              // Handle regular inputs
              inputElement.value = value !== null && value !== undefined ? String(value) : '';
            }
          }
          
          // Dispatch change event
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    };
    
    // Reset form to initial state
    const resetForm = (): void => {
      form.reset();
      
      // Trigger change event on all inputs to update validation state
      inputs.forEach(input => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    };
    
    // Submit the form programmatically
    const submitForm = async (): Promise<any> => {
      // Validate first if enabled
      if (defaultOptions.validateOnSubmit && !validateForm()) {
        return Promise.reject(new Error('Form validation failed'));
      }
      
      // Get form data
      const formData = getFormValues();
      
      try {
        let response;
        
        // Use callback if provided
        if (typeof defaultOptions.submitCallback === 'function') {
          response = await Promise.resolve(defaultOptions.submitCallback(formData, form));
          
          // Call success callback if provided
          if (typeof defaultOptions.successCallback === 'function') {
            defaultOptions.successCallback(response, form);
          }
        } else {
          // Default submit behavior using fetch if action attribute exists
          const action = form.getAttribute('action');
          if (action) {
            const method = (form.getAttribute('method') || 'POST').toUpperCase();
            const isGet = method === 'GET';
            
            if (isGet) {
              // Build query string for GET requests
              const queryParams = new URLSearchParams();
              Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  queryParams.append(key, String(value));
                }
              });
              
              response = await fetch(`${action}?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                }
              });
            } else {
              // Send as JSON for POST, PUT, PATCH, etc.
              response = await fetch(action, {
                method,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
              });
            }
            
            // Parse response
            if (response.headers.get('content-type')?.includes('application/json')) {
              response = await response.json();
            } else {
              response = await response.text();
            }
            
            // Call success callback if provided
            if (typeof defaultOptions.successCallback === 'function') {
              defaultOptions.successCallback(response, form);
            }
          }
        }
        
        return response;
      } catch (error) {
        // Call error callback if provided
        if (typeof defaultOptions.errorCallback === 'function') {
          defaultOptions.errorCallback(error, form);
        }
        
        throw error;
      }
    };
    
    // Form submit handler
    const handleSubmit = async (event: Event): Promise<void> => {
      if (defaultOptions.preventDefaultSubmit) {
        event.preventDefault();
      }
      
      try {
        await submitForm();
      } catch (error) {
        console.error('Form submission error:', error);
      }
    };
    
    // Add submit event listener
    form.addEventListener('submit', handleSubmit);
    eventHandlers.push([form, 'submit', handleSubmit]);
    
    // Add change event listeners for validateOnChange
    if (defaultOptions.validateOnChange) {
      const handleChange = () => validateForm();
      form.addEventListener('change', handleChange);
      eventHandlers.push([form, 'change', handleChange]);
    }
    
    // Cleanup function to remove all enhancements
    const cleanup = (): void => {
      // Remove enhanced inputs
      enhancedInputs.forEach(removeEnhancement => removeEnhancement());
      
      // Remove event listeners
      eventHandlers.forEach(([element, eventType, listener]) => {
        element.removeEventListener(eventType, listener);
      });
    };
    
    // Return form utilities and cleanup function
    return {
      validate: validateForm,
      getValues: getFormValues,
      setValues: setFormValues,
      reset: resetForm,
      submit: submitForm,
      cleanup
    };
  } catch (error) {
    console.error('Error in enhanceForm:', error);
    
    // Return no-op functions as a fallback
    return {
      validate: () => false,
      getValues: () => ({}),
      setValues: () => {},
      reset: () => {},
      submit: () => Promise.reject(error),
      cleanup: () => {}
    };
  }
}

/**
 * Generates a summary of form values for display
 * @param formElement - The form to summarize
 * @param options - Configuration options
 * @returns The created summary element
 */
export function createFormSummary(
  formElement: string | HTMLFormElement,
  options: {
    containerTagName?: string;
    labelTagName?: string;
    valueTagName?: string;
    includeFields?: string[];
    excludeFields?: string[];
    formatters?: Record<string, (value: any) => string>;
    labels?: Record<string, string>;
    hideEmpty?: boolean;
  } = {}
): HTMLElement {
  try {
    // Default options
    const defaultOptions = {
      containerTagName: 'dl',
      labelTagName: 'dt',
      valueTagName: 'dd',
      includeFields: [],
      excludeFields: [],
      formatters: {},
      labels: {},
      hideEmpty: true,
      ...options
    };
    
    // Get the form element
    const form = typeof formElement === 'string'
      ? document.getElementById(formElement.replace(/^#/, '')) as HTMLFormElement
      : formElement;
    
    if (!form || form.tagName !== 'FORM') {
      console.warn('createFormSummary: Invalid form element', formElement);
      const errorElement = document.createElement('div');
      errorElement.className = 'form-summary-error';
      errorElement.textContent = 'Invalid form element';
      return errorElement;
    }
    
    // Create summary container
    const container = document.createElement(defaultOptions.containerTagName);
    container.className = 'form-summary';
    
    // Get form values
    const formData = (() => {
      const values: Record<string, any> = {};
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
      
      inputs.forEach(input => {
        const inputElement = input as HTMLInputElement;
        
        // Skip buttons, fieldsets, and disabled inputs
        if (inputElement.type === 'button' || 
            inputElement.type === 'submit' || 
            inputElement.type === 'reset' || 
            inputElement.tagName === 'FIELDSET' ||
            inputElement.disabled) {
          return;
        }
        
        // Get the field name (use id if name not available)
        const fieldName = inputElement.name || inputElement.id;
        if (!fieldName) return;
        
        // Check include/exclude lists
        if (defaultOptions.includeFields.length > 0 && 
            !defaultOptions.includeFields.includes(fieldName)) {
          return;
        }
        
        if (defaultOptions.excludeFields.includes(fieldName)) {
          return;
        }
        
        // Get field label
        let label = defaultOptions.labels[fieldName] || 
                   inputElement.dataset.label ||
                   findLabelForInput(inputElement)?.textContent || 
                   fieldName.replace(/([A-Z])/g, ' $1')
                          .replace(/[-_]/g, ' ')
                          .replace(/^\w/, c => c.toUpperCase());
        
        // Get field value
        let value;
        if (inputElement.type === 'checkbox') {
          value = inputElement.checked;
        } else if (inputElement.type === 'radio') {
          if (inputElement.checked) {
            value = inputElement.value;
          } else {
            return; // Skip unchecked radio buttons
          }
        } else if (inputElement.type === 'select-multiple' && inputElement.tagName === 'SELECT') {
          const selectElement = inputElement as unknown as HTMLSelectElement;
          value = Array.from(selectElement.selectedOptions)
            .map(option => option.text).join(', ');
        } else if (inputElement.type === 'select-one' && inputElement.tagName === 'SELECT') {
          const selectElement = inputElement as unknown as HTMLSelectElement;
          value = selectElement.options[selectElement.selectedIndex]?.text || '';
        } else {
          value = inputElement.value;
        }
        
        // Skip empty values if hideEmpty is true
        if (defaultOptions.hideEmpty && 
            (value === '' || value === null || value === undefined ||
             (Array.isArray(value) && value.length === 0))) {
          return;
        }
        
        // Apply formatter if available
        if (typeof defaultOptions.formatters[fieldName] === 'function') {
          value = defaultOptions.formatters[fieldName](value);
        }
        
        values[fieldName] = { label, value };
      });
      
      return values;
    })();
    
    // Create summary entries
    Object.entries(formData).forEach(([fieldName, { label, value }]) => {
      // Create label element
      const labelElement = document.createElement(defaultOptions.labelTagName);
      labelElement.className = 'form-summary-label';
      labelElement.textContent = label;
      
      // Create value element
      const valueElement = document.createElement(defaultOptions.valueTagName);
      valueElement.className = 'form-summary-value';
      
      // Format boolean values
      if (typeof value === 'boolean') {
        valueElement.textContent = value ? 'Yes' : 'No';
      } else {
        valueElement.textContent = value !== null && value !== undefined ? String(value) : '';
      }
      
      // Add data attribute for field name
      labelElement.dataset.field = fieldName;
      valueElement.dataset.field = fieldName;
      
      // Add to container
      container.appendChild(labelElement);
      container.appendChild(valueElement);
    });
    
    return container;
  } catch (error) {
    console.error('Error in createFormSummary:', error);
    const errorElement = document.createElement('div');
    errorElement.className = 'form-summary-error';
    errorElement.textContent = 'Error creating form summary';
    return errorElement;
  }
}

/**
 * Helper function to find label associated with an input
 */
function findLabelForInput(input: HTMLInputElement): HTMLLabelElement | null {
  // Check for explicit label association
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label as HTMLLabelElement;
  }
  
  // Check if input is inside a label
  let parent = input.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') {
      return parent as HTMLLabelElement;
    }
    parent = parent.parentElement;
  }
  
  return null;
} 