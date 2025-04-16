import React, { useCallback, useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ComponentType, 
  ComponentCapability, 
  DataType,
  ComponentEventType,
  ComponentDefinition,
  Connection
} from '../ComponentTypes';
import { componentRegistry } from '../ComponentRegistry';
import { withIntelligentComponent } from '../IntelligentComponent';
import { useTheme } from '../../theme/ThemeProvider';
import './Select.css'; // Import the CSS file with animations

/**
 * Define Select capabilities
 */
const selectCapabilities: ComponentCapability[] = [
  {
    id: 'interaction',
    name: 'User Interaction',
    description: 'Capabilities related to user interactions with the select component',
    connectionPoints: [
      {
        id: 'change',
        name: 'Selection Change Event',
        description: 'Triggered when the selected option changes',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'focus',
        name: 'Focus Event',
        description: 'Triggered when the select is focused',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'blur',
        name: 'Blur Event',
        description: 'Triggered when the select loses focus',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'open',
        name: 'Open Event',
        description: 'Triggered when the select dropdown opens',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'close',
        name: 'Close Event',
        description: 'Triggered when the select dropdown closes',
        type: DataType.OBJECT,
        direction: 'output'
      },
      {
        id: 'enabled',
        name: 'Select Enabled State',
        description: 'Controls whether the select is enabled or disabled',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: true
      }
    ]
  },
  {
    id: 'data',
    name: 'Data Properties',
    description: 'Capabilities related to the select data',
    connectionPoints: [
      {
        id: 'options',
        name: 'Select Options',
        description: 'Array of options to display in the select',
        type: DataType.ARRAY,
        direction: 'input',
        defaultValue: []
      },
      {
        id: 'value',
        name: 'Selected Value',
        description: 'The currently selected value',
        type: DataType.ANY,
        direction: 'bidirectional',
        defaultValue: ''
      },
      {
        id: 'placeholder',
        name: 'Placeholder Text',
        description: 'Text to display when no option is selected',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'Select an option...'
      },
      {
        id: 'loading',
        name: 'Loading State',
        description: 'Whether the options are currently loading',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      },
      {
        id: 'error',
        name: 'Error State',
        description: 'Error message to display',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      }
    ]
  },
  {
    id: 'behavior',
    name: 'Behavior Properties',
    description: 'Capabilities related to the select behavior',
    connectionPoints: [
      {
        id: 'multiple',
        name: 'Multiple Selection',
        description: 'Whether multiple options can be selected',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      },
      {
        id: 'searchable',
        name: 'Searchable',
        description: 'Whether the options can be searched',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      },
      {
        id: 'clearable',
        name: 'Clearable',
        description: 'Whether the selection can be cleared',
        type: DataType.BOOLEAN,
        direction: 'input',
        defaultValue: false
      },
      {
        id: 'maxItems',
        name: 'Maximum Items',
        description: 'Maximum number of items that can be selected (for multiple)',
        type: DataType.NUMBER,
        direction: 'input',
        defaultValue: null
      }
    ]
  },
  {
    id: 'display',
    name: 'Display Properties',
    description: 'Capabilities related to the select appearance',
    connectionPoints: [
      {
        id: 'label',
        name: 'Field Label',
        description: 'Label text displayed above the select',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: ''
      },
      {
        id: 'variant',
        name: 'Select Variant',
        description: 'Visual style variant of the select',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'default'
      },
      {
        id: 'size',
        name: 'Select Size',
        description: 'Size of the select component',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'medium'
      },
      {
        id: 'dropdownPosition',
        name: 'Dropdown Position',
        description: 'Position of the dropdown relative to the input',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'bottom'
      },
      {
        id: 'animation',
        name: 'Animation Type',
        description: 'Type of animation for the dropdown',
        type: DataType.TEXT,
        direction: 'input',
        defaultValue: 'fade-down'
      }
    ]
  },
  {
    id: 'state',
    name: 'State Management',
    description: 'Capabilities related to select state',
    connectionPoints: [
      {
        id: 'state',
        name: 'Select State',
        description: 'Current state of the select',
        type: DataType.OBJECT,
        direction: 'bidirectional',
        defaultValue: {
          isOpen: false,
          isFocused: false,
          searchQuery: '',
          selectedOption: null,
          selectedOptions: []
        }
      }
    ]
  }
];

// Define Select variant and size types
type SelectVariant = 'default' | 'outlined' | 'filled' | 'custom';
type SelectSize = 'small' | 'medium' | 'large' | 'custom';
type DropdownPosition = 'top' | 'bottom';
type DropdownAnimation = 'fade-down' | 'fade-up' | 'none';

type SelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: React.ReactNode;
  [key: string]: any;
};

// Interface for select state
interface SelectState {
  isOpen: boolean;
  isFocused: boolean;
  searchQuery: string;
  selectedOption: SelectOption | null;
  selectedOptions: SelectOption[];
  filteredOptions: SelectOption[];
  [key: string]: any;
}

/**
 * Props for the Intelligent Select Component
 */
interface IntelligentSelectProps {
  // Component system props
  componentId?: string;
  componentType?: ComponentType;
  sendEvent?: (type: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue?: (connectionId: string) => any;
  connect?: (sourceConnectionId: string, targetComponentId: string, targetConnectionId: string, transform?: (value: any) => any) => any;
  disconnect?: (connectionId: string) => boolean;
  
  // Select specific props
  label?: string;
  options?: SelectOption[];
  value?: any;
  onChange?: (value: any, option?: SelectOption | SelectOption[]) => void;
  placeholder?: string;
  variant?: SelectVariant;
  size?: SelectSize;
  disabled?: boolean;
  className?: string;
  testId?: string;
  
  // Enhanced props
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  error?: string;
  maxItems?: number;
  dropdownPosition?: DropdownPosition;
  animation?: DropdownAnimation;
  
  // Event handlers
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onOpen?: () => void;
  onClose?: () => void;
  
  // Customization props
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  renderSelectedValue?: (option: SelectOption | SelectOption[] | null) => React.ReactNode;
  
  // Style props
  style?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  optionStyle?: React.CSSProperties;
  
  // State management props
  initialState?: Partial<SelectState>;
  onStateChange?: (newState: SelectState) => void;
}

/**
 * Get animation class name based on animation type
 */
const getAnimationClassName = (animation: DropdownAnimation): string => {
  switch (animation) {
    case 'fade-down':
      return 'select-dropdown-fade-down';
    case 'fade-up':
      return 'select-dropdown-fade-up';
    default:
      return '';
  }
};

/**
 * Base Select implementation that uses the intelligent component system
 */
const IntelligentSelectBase: React.FC<IntelligentSelectProps> = ({
  componentId,
  componentType,
  sendEvent,
  getConnectionValue,
  connect,
  disconnect,
  label: propLabel,
  options: propOptions = [],
  value: propValue,
  onChange,
  placeholder: propPlaceholder = 'Select an option...',
  variant: propVariant = 'default',
  size = 'medium',
  disabled: propDisabled = false,
  className,
  testId,
  
  // Enhanced props
  multiple: propMultiple = false,
  searchable: propSearchable = false,
  clearable: propClearable = false,
  loading: propLoading = false,
  error: propError = '',
  maxItems: propMaxItems,
  dropdownPosition: propDropdownPosition = 'bottom',
  animation: propAnimation = 'fade-down',
  
  // Event handlers
  onFocus,
  onBlur,
  onOpen,
  onClose,
  
  // Customization props
  renderOption,
  renderSelectedValue,
  
  // Style props
  style,
  dropdownStyle,
  optionStyle,
  
  // State management props
  initialState = {},
  onStateChange,
  ...rest
}) => {
  // Get values from connections if available
  const connectionLabel = getConnectionValue?.('label');
  const connectionOptions = getConnectionValue?.('options');
  const connectionValue = getConnectionValue?.('value');
  const connectionPlaceholder = getConnectionValue?.('placeholder');
  const connectionDisabled = getConnectionValue?.('enabled') !== undefined ? !getConnectionValue?.('enabled') : undefined;
  const connectionVariant = getConnectionValue?.('variant');
  const connectionMultiple = getConnectionValue?.('multiple');
  const connectionSearchable = getConnectionValue?.('searchable');
  const connectionClearable = getConnectionValue?.('clearable');
  const connectionLoading = getConnectionValue?.('loading');
  const connectionError = getConnectionValue?.('error');
  const connectionMaxItems = getConnectionValue?.('maxItems');
  const connectionDropdownPosition = getConnectionValue?.('dropdownPosition');
  const connectionAnimation = getConnectionValue?.('animation');
  const connectionState = getConnectionValue?.('state');
  
  // Use connection values or props
  const label = connectionLabel || propLabel || '';
  const options = connectionOptions || propOptions || [];
  const value = connectionValue !== undefined ? connectionValue : propValue;
  const placeholder = connectionPlaceholder || propPlaceholder || '';
  const disabled = connectionDisabled !== undefined ? connectionDisabled : propDisabled;
  const variant = (connectionVariant || propVariant || 'default') as SelectVariant;
  const multiple = connectionMultiple !== undefined ? connectionMultiple : propMultiple;
  const searchable = connectionSearchable !== undefined ? connectionSearchable : propSearchable;
  const clearable = connectionClearable !== undefined ? connectionClearable : propClearable;
  const loading = connectionLoading !== undefined ? connectionLoading : propLoading;
  const error = connectionError || propError || '';
  const maxItems = connectionMaxItems !== undefined ? connectionMaxItems : propMaxItems;
  const dropdownPosition = (connectionDropdownPosition || propDropdownPosition || 'bottom') as DropdownPosition;
  const animation = (connectionAnimation || propAnimation || 'fade-down') as DropdownAnimation;
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Find the selected option(s) from value
  const findSelectedOption = (optionValue: any): SelectOption | null => {
    return options.find((option: SelectOption) => option.value === optionValue) || null;
  };
  
  const findSelectedOptions = (values: any[]): SelectOption[] => {
    return values.map(v => findSelectedOption(v)).filter(Boolean) as SelectOption[];
  };
  
  // Initialize state from props/connections with defaults
  const [state, setState] = useState<SelectState>(() => {
    // Default state
    let defaultState: SelectState = {
      isOpen: false,
      isFocused: false,
      searchQuery: '',
      selectedOption: null,
      selectedOptions: [],
      filteredOptions: options,
    };
    
    // Set initial selected option(s) based on value
    if (value !== undefined) {
      if (multiple && Array.isArray(value)) {
        defaultState.selectedOptions = findSelectedOptions(value);
      } else if (!multiple && value !== null && value !== '') {
        defaultState.selectedOption = findSelectedOption(value);
      }
    }
    
    // Apply custom initial state
    return {
      ...defaultState,
      ...initialState,
      ...(connectionState || {})
    };
  });
  
  // Update state function that also emits events
  const updateState = useCallback((updates: Partial<SelectState>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates };
      
      // Send state update through the component system
      if (sendEvent && componentId) {
        sendEvent(ComponentEventType.STATE_CHANGE, 'state', newState);
      }
      
      // Call the prop onStateChange if provided
      if (onStateChange) {
        onStateChange(newState);
      }
      
      return newState;
    });
  }, [componentId, sendEvent, onStateChange]);
  
  // Update filtered options when search query changes
  useEffect(() => {
    if (searchable) {
      const query = state.searchQuery.toLowerCase();
      const filtered = options.filter((option: SelectOption) => 
        option.label.toLowerCase().includes(query)
      );
      updateState({ filteredOptions: filtered });
    } else {
      updateState({ filteredOptions: options });
    }
  }, [searchable, options, state.searchQuery, updateState]);
  
  // Filter options on search
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    updateState({ searchQuery: query });
  }, [updateState]);
  
  // Update from external value changes
  useEffect(() => {
    if (value !== undefined) {
      if (multiple && Array.isArray(value)) {
        const selectedOptions = findSelectedOptions(value);
        updateState({ selectedOptions });
      } else if (!multiple && value !== null) {
        const selectedOption = findSelectedOption(value);
        updateState({ selectedOption });
      }
    }
  }, [value, multiple, options, updateState]);
  
  // Open/close dropdown when isOpen state changes
  useEffect(() => {
    // Focus search input when dropdown opens if searchable
    if (state.isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    // Emit open/close events
    if (state.isOpen) {
      if (sendEvent && componentId) {
        sendEvent(ComponentEventType.CUSTOM, 'open', {
          timestamp: new Date().toISOString()
        });
      }
      if (onOpen) {
        onOpen();
      }
    } else {
      if (sendEvent && componentId) {
        sendEvent(ComponentEventType.CUSTOM, 'close', {
          timestamp: new Date().toISOString()
        });
      }
      if (onClose) {
        onClose();
      }
      
      // Clear search query when dropdown closes
      if (searchable) {
        updateState({ searchQuery: '' });
      }
    }
  }, [state.isOpen, searchable, componentId, sendEvent, onOpen, onClose, updateState]);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        updateState({ isOpen: false });
      }
    };
    
    if (state.isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.isOpen, updateState]);
  
  // Toggle dropdown state
  const handleToggleDropdown = useCallback(() => {
    if (!disabled) {
      updateState({ isOpen: !state.isOpen });
    }
  }, [disabled, state.isOpen, updateState]);
  
  // Handle option selection
  const handleSelectOption = useCallback((option: SelectOption) => {
    if (option.disabled) return;
    
    if (multiple) {
      // For multiple selection
      const isSelected = state.selectedOptions.some(
        selected => selected.value === option.value
      );
      
      let newSelectedOptions: SelectOption[];
      
      if (isSelected) {
        // Remove option if already selected
        newSelectedOptions = state.selectedOptions.filter(
          selected => selected.value !== option.value
        );
      } else {
        // Add option if not exceeding maxItems
        if (maxItems && state.selectedOptions.length >= maxItems) {
          // Replace the last item if maxItems is reached
          const newOptions = [...state.selectedOptions];
          newOptions.pop();
          newSelectedOptions = [...newOptions, option];
        } else {
          newSelectedOptions = [...state.selectedOptions, option];
        }
      }
      
      updateState({ selectedOptions: newSelectedOptions });
      
      // Call onChange with array of values
      if (onChange) {
        onChange(
          newSelectedOptions.map(opt => opt.value),
          newSelectedOptions
        );
      }
      
      // Send change event through component system
      if (sendEvent && componentId) {
        sendEvent(ComponentEventType.CHANGE, 'change', {
          timestamp: new Date().toISOString(),
          value: newSelectedOptions.map(opt => opt.value),
          options: newSelectedOptions
        });
      }
      
      // Don't close the dropdown for multiple selection
    } else {
      // For single selection
      updateState({ 
        selectedOption: option,
        isOpen: false 
      });
      
      // Call onChange with single value
      if (onChange) {
        onChange(option.value, option);
      }
      
      // Send change event through component system
      if (sendEvent && componentId) {
        sendEvent(ComponentEventType.CHANGE, 'change', {
          timestamp: new Date().toISOString(),
      value: option.value,
          option
        });
      }
    }
  }, [multiple, maxItems, state.selectedOptions, state.isOpen, updateState, onChange, sendEvent, componentId]);
  
  // Handle focus event
  const handleFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    updateState({ isFocused: true });
    
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.FOCUS, 'focus', {
        timestamp: new Date().toISOString(),
        event: e
      });
    }
    
    if (onFocus) {
      onFocus(e);
    }
  }, [updateState, sendEvent, componentId, onFocus]);
  
  // Handle blur event
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    // Only update focus state if not clicking within the component
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      updateState({ isFocused: false });
      
      if (sendEvent && componentId) {
        sendEvent(ComponentEventType.BLUR, 'blur', {
          timestamp: new Date().toISOString(),
          event: e
        });
      }
      
      if (onBlur) {
        onBlur(e);
      }
    }
  }, [updateState, sendEvent, componentId, onBlur]);
  
  // Clear selection
  const handleClearSelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (multiple) {
      updateState({ selectedOptions: [] });
      
      if (onChange) {
        onChange([], []);
    }
    } else {
      updateState({ selectedOption: null });
      
      if (onChange) {
        onChange(null, undefined);
      }
    }
    
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CHANGE, 'change', {
        timestamp: new Date().toISOString(),
        value: multiple ? [] : null
      });
    }
  }, [multiple, updateState, onChange, sendEvent, componentId]);
  
  // Remove a selected item in multiple mode
  const handleRemoveItem = useCallback((e: React.MouseEvent, optionToRemove: SelectOption) => {
    e.stopPropagation();
    
    const newSelectedOptions = state.selectedOptions.filter(
      option => option.value !== optionToRemove.value
    );
    
    updateState({ selectedOptions: newSelectedOptions });
    
    if (onChange) {
      onChange(
        newSelectedOptions.map(opt => opt.value),
        newSelectedOptions
      );
    }
    
    if (sendEvent && componentId) {
      sendEvent(ComponentEventType.CHANGE, 'change', {
        timestamp: new Date().toISOString(),
        value: newSelectedOptions.map(opt => opt.value),
        options: newSelectedOptions
      });
    }
  }, [state.selectedOptions, updateState, onChange, sendEvent, componentId]);
  
  // Determine what to display in the select input
  const getDisplayValue = useCallback(() => {
    if (multiple) {
      if (state.selectedOptions.length === 0) {
        return placeholder;
      }
      
      if (renderSelectedValue) {
        return renderSelectedValue(state.selectedOptions);
      }
      
      // Display tag count if not rendering in the dropdown
      return (
        <div className="select-tags-container">
          {state.selectedOptions.map(option => (
            <div key={option.value.toString()} className="select-tag">
              <span className="select-tag-text">{option.label}</span>
              {clearable && (
                <span 
                  className="select-tag-remove"
                  onClick={(e) => handleRemoveItem(e, option)}
                >
                  ✕
                </span>
              )}
            </div>
          ))}
        </div>
      );
    } else {
      if (!state.selectedOption) {
        return placeholder;
      }
      
      if (renderSelectedValue) {
        return renderSelectedValue(state.selectedOption);
      }
      
      return state.selectedOption.label;
    }
  }, [
    multiple, 
    state.selectedOptions, 
    state.selectedOption, 
    placeholder, 
    renderSelectedValue, 
    clearable, 
    handleRemoveItem
  ]);
  
  // Determine if an option is selected
  const isOptionSelected = useCallback((option: SelectOption) => {
    if (multiple) {
      return state.selectedOptions.some(
        selected => selected.value === option.value
      );
    }
    
    return state.selectedOption?.value === option.value;
  }, [multiple, state.selectedOptions, state.selectedOption]);
  
  // Determine CSS classes
  const selectContainerClass = [
    'select-container',
    `select-variant-${variant}`,
    className,
    disabled ? 'select-disabled' : '',
    state.isFocused ? 'select-focused' : '',
    error ? 'select-error' : ''
  ].filter(Boolean).join(' ');
  
  const dropdownClass = [
    'select-dropdown',
    getAnimationClassName(animation)
  ].filter(Boolean).join(' ');
  
  const chevronClass = [
    'select-chevron',
    state.isOpen ? 'select-chevron-open' : ''
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      ref={containerRef}
      className={selectContainerClass}
      tabIndex={disabled ? -1 : 0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-testid={testId}
      {...rest}
    >
      {label && (
        <label className="select-label">
          {label}
        </label>
      )}
      
      <div 
        className={`select-input select-variant-${variant}`}
        onClick={handleToggleDropdown}
      >
        <div className="select-value">
          {loading ? (
            <div className="select-loading-indicator" />
          ) : null}
          
          {getDisplayValue()}
        </div>
        
        <div className="select-actions">
          {clearable && (state.selectedOption || state.selectedOptions.length > 0) && !disabled ? (
            <div 
              className="select-clear"
              onClick={handleClearSelection}
          >
              ✕
            </div>
          ) : null}
          
          <div className={chevronClass}>
            ▼
          </div>
        </div>
      </div>
      
      {error && (
        <div className="select-error-message">
          {error}
        </div>
      )}
      
      {state.isOpen && (
            <div
          ref={dropdownRef}
          className={dropdownClass}
              style={{
            [dropdownPosition === 'top' ? 'bottom' : 'top']: '100%',
            ...dropdownStyle
          }}
        >
          {searchable && (
            <div className="select-search">
              <input
                ref={searchInputRef}
                type="text"
                value={state.searchQuery}
                onChange={handleSearch}
                className="select-search-input"
                placeholder="Search..."
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
          
          {state.filteredOptions.length === 0 ? (
            <div className="select-empty">
            No options available
          </div>
          ) : (
            state.filteredOptions.map(option => {
              const isSelected = isOptionSelected(option);
              const optionClassName = [
                'select-option',
                isSelected ? 'select-option-selected' : '',
                option.disabled ? 'select-option-disabled' : ''
              ].filter(Boolean).join(' ');
              
              return (
                <div
                  key={option.value.toString()}
                  className={optionClassName}
                  onClick={() => handleSelectOption(option)}
                  style={optionStyle}
                >
                  {renderOption ? (
                    renderOption(option, isSelected)
                  ) : (
                    <div className="select-option-content">
                      {option.icon && (
                        <span className="select-option-icon">
                          {option.icon}
                        </span>
                      )}
                      <span className="select-option-label">
                        {option.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
      )}
    </div>
  );
};

/**
 * Component definition for the component registry
 */
const selectComponentDefinition: ComponentDefinition = {
  meta: {
    type: ComponentType.SELECT,
    name: 'Select',
    description: 'An intelligent select component that can be customized and connected to other components',
    capabilities: selectCapabilities
  },
  initializer: (props: Record<string, any>) => ({
    id: props.id || uuidv4(),
    type: ComponentType.SELECT,
    properties: {
      options: props.options || [],
      placeholder: props.placeholder || 'Select an option...',
      variant: props.variant || 'default',
      size: props.size || 'medium'
    }
  }),
  renderer: () => null // The actual rendering is handled by the HOC
};

// Register the component
componentRegistry.registerComponent(selectComponentDefinition);

// Create the enhanced component with the intelligent component wrapper
const IntelligentSelect = withIntelligentComponent<IntelligentSelectProps>(
  IntelligentSelectBase,
  ComponentType.SELECT
);

export { IntelligentSelect };
export default IntelligentSelect; 