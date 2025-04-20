import React from 'react';
import { registerComponent } from './ComponentFactory';
// Import DynamicComponent to allow ListComponent to render item templates
import { DynamicComponent } from './DynamicComponent'; 
// Import ComponentChild type for ListComponent template handling
import type { ComponentChild } from './DynamicComponent';

// Import chart components - use correct paths
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import DataGrid from './charts/DataGrid';
import AdvancedChart from './charts/AdvancedChart';
import DataSeriesChart from './charts/DataSeriesChart';

// Import basic components
import { Container, Text, Button } from './BasicComponents';
// Import layout components
import Grid from './components/layout/Grid';
import Card from './components/layout/Card';

// Add the import for Video component
import Video from './components/basic/Video';

// Define types for component props and return types
interface FallbackComponentProps {
  [key: string]: any;
}

type ComponentType = React.ComponentType<any>;

// Function to safely wrap method code to prevent syntax errors
const wrapMethodCode = (code: string): string => {
  // Check if the code already has a function declaration
  if (code.trim().startsWith('function')) {
    // Wrap in a return statement to ensure it returns a function
    return `return ${code}`;
  } else {
    // Wrap in a return and a function to ensure it's proper function syntax
    return `return function(event, $m) { ${code} }`;
  }
};

/**
 * Register all available components with the ComponentFactory
 */
export function registerAllComponents() {
  // Register native HTML elements
  const nativeElements = ['div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];
  
  nativeElements.forEach(element => {
    registerComponent({
      name: element,
      getComponent: () => Promise.resolve(
        // Return a proper React component function, not a JSX literal
        function NativeElementComponent(props) {
          // Safely handle null/undefined props
          const safeProps = props || {};
          // Spread all props except children to avoid unexpected behavior
          const { children, ...restProps } = safeProps;
          // Return the element with proper React.createElement
          return React.createElement(element, restProps, children);
        }
      ),
      defaultProps: {}
    });
  });

  // Register basic UI components
  registerComponent({
    name: 'Container',
    getComponent: () => Promise.resolve(
      function ContainerComponent(props) {
        const { children, style = {}, ...rest } = props || {};
        
        // Log the container props for debugging
        console.log('Container component rendering:', { id: props.id, hasChildren: !!children });
        
        return React.createElement('div', {
          style: {
            display: 'block',
            width: '100%',
            ...(style || {})
          },
          ...rest
        }, children);
      }
    ),
    defaultProps: {
      className: '',
      style: {},
      disabled: 'false'
    }
  });
  
  // Also register lowercase 'container' to match lookup in component mapping
  registerComponent({
    name: 'container',
    getComponent: () => Promise.resolve(
      function ContainerComponent(props) {
        const { children, style = {}, ...rest } = props || {};
        
        // Log the container props for debugging
        console.log('container (lowercase) component rendering:', { id: props.id, hasChildren: !!children });
        
        return React.createElement('div', {
          style: {
            display: 'block',
            width: '100%',
            ...(style || {})
          },
          ...rest
        }, children);
      }
    ),
    defaultProps: {
      className: '',
      style: {},
      disabled: 'false'
    }
  });
  
  // Register Text component with lowercase name to match the lookup
  registerComponent({
    name: 'Text',
    getComponent: () => Promise.resolve(Text),
    defaultProps: {
      variant: 'p',
      className: '',
      style: {}
    }
  });
  
  // Also register lowercase 'text' component to match the lookup in DynamicComponent
  registerComponent({
    name: 'text',
    getComponent: () => Promise.resolve(Text),
    defaultProps: {
      variant: 'p',
      className: '',
      style: {}
    }
  });
  
  registerComponent({
    name: 'Button',
    getComponent: () => Promise.resolve(Button),
    defaultProps: {
      variant: 'primary',
      className: '',
      style: {},
      disabled: 'false'
    }
  });
  
  // Also register lowercase 'button' component to match the lookup
  registerComponent({
    name: 'button',
    getComponent: () => Promise.resolve(
      function ButtonComponent(props) {
        const { text, content, children, style = {}, ...rest } = props || {};
        
        // Debugging: log the properties received
        console.log('Button component props:', { text, content, children, hasProps: !!props });
        
        // Make sure to show either text, content property or children in that order of precedence
        const buttonContent = text || content || children || '';
        
        return React.createElement('button', {
          style: {
            padding: '8px 16px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: '#fff',
            ...style
          },
          ...rest
        }, buttonContent);
      }
    ),
    defaultProps: {
      variant: 'primary',
      className: '',
      style: {},
      disabled: 'false'
    }
  });

  // Register LineChart
  registerComponent({
    name: 'LineChart',
    getComponent: () => Promise.resolve(LineChart),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 300,
      width: '100%',
      title: '',
      subtitle: '',
      xKey: 'x',
      yKey: 'y',
      lineColor: '#4E79A7',
      gridLines: 'true',
      showLegend: 'true',
      pointStyles: 'circle',
      interaction: {}
    },
    transformProps: (props) => ({
      ...props,
      data: props.data || [],
      height: props.height || 300,
      width: props.width || '100%'
    })
  });
    
  // Register BarChart
  registerComponent({
    name: 'BarChart',
    getComponent: () => Promise.resolve(BarChart),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 300,
      width: '100%',
      title: '',
      subtitle: '',
      xKey: 'x',
      yKey: 'y',
      barColors: ['#4E79A7', '#F28E2B', '#E15759'],
      gridLines: 'true',
      showLegend: 'true',
      interaction: {}
    }
  });
    
  // Register PieChart
  registerComponent({
    name: 'PieChart',
    getComponent: () => Promise.resolve(PieChart),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 300,
      width: '100%',
      title: '',
      subtitle: '',
      labelKey: 'label',
      valueKey: 'value',
      colors: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948'],
      showLegend: 'true',
      donut: 'false',
      interaction: {}
    }
  });
    
  // Register DataGrid
  registerComponent({
    name: 'DataGrid',
    getComponent: () => Promise.resolve(DataGrid),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 400,
      width: '100%',
      title: '',
      columns: [],
      pagination: 'true',
      pageSize: 10,
      sortable: 'true',
      filterable: 'true',
      selectable: 'false',
      exportable: 'false',
      theme: 'light'
    }
  });
    
  // Register AdvancedChart
  registerComponent({
    name: 'AdvancedChart',
    getComponent: () => Promise.resolve(AdvancedChart),
    defaultProps: {
      data: [],
      type: 'line',
      xKey: 'x',
      yKey: 'y',
      height: 300,
      libraryPreference: 'any',
      theme: 'light'
    }
  });
  
  // Register Grid component
  registerComponent({
    name: 'grid',
    getComponent: () => Promise.resolve(
      function GridComponent(props) {
        const { children, style = {}, ...rest } = props || {};
        
        // Convert string 'true'/'false' to boolean for conditionals
        const isContainer = props.container === 'true' || props.container === true;
        const isItem = props.item === 'true' || props.item === true;
        const spacing = typeof props.spacing === 'number' ? props.spacing : 0;
        const direction = props.direction || 'row';
        const wrap = props.wrap || 'wrap';
        
        // Determine the appropriate style based on container/item
        const gridStyle = {
          ...(isContainer ? {
            display: 'flex',
            flexDirection: direction === 'row' ? 'row' : 'column',
            flexWrap: wrap === 'wrap' ? 'wrap' : 'nowrap',
            gap: `${spacing * 8}px`,
          } : {}),
          ...(isItem ? {
            flex: '1 1 auto',
          } : {}),
          ...(style || {})
        };
        
        return React.createElement('div', {
          style: gridStyle,
          ...rest
        }, children);
      }
    ),
    defaultProps: {
      container: 'false',
      item: 'false',
      spacing: 0,
      direction: 'row',
      wrap: 'wrap',
      style: {}
    }
  });
  
  // Register TextInput component
  registerComponent({
    name: 'text-input',
    getComponent: () => Promise.resolve(
      function TextInputComponent(props) {
        const { type = 'text', style = {}, id, value, onChange, ...rest } = props || {};
        
        // Convert string 'true'/'false' to boolean for React props
        const fullWidth = props.fullWidth === 'true' || props.fullWidth === true;
        
        // Determine if the input should be controlled
        // It's controlled only if an onChange handler is provided
        const isControlled = onChange !== undefined;

        // Only provide value prop if it's controlled, otherwise let it be uncontrolled
        const inputProps: any = {
          type,
          style: {
            width: fullWidth ? '100%' : 'auto',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            ...(style || {})
          },
          id,
          onChange,
          ...rest
        };

        if (isControlled) {
          // For controlled, always provide a string value (default to empty string)
          inputProps.value = value ?? ''; 
        } else {
          // For uncontrolled, provide defaultValue if value exists, otherwise omit value entirely
          if (value !== undefined && value !== null) {
             inputProps.defaultValue = value;
          }
          // DO NOT provide the value prop for uncontrolled inputs
        }

        return React.createElement('input', inputProps);
      }
    ),
    defaultProps: {
      variant: 'outlined',
      size: 'medium',
      type: 'text',
      fullWidth: 'true',
      style: {}
    }
  });
  
  // Register Textarea component for multiline text input
  registerComponent({
    name: 'textarea',
    getComponent: () => Promise.resolve(
      function TextareaComponent(props) {
        const { style = {}, id, value, onChange, rows = 3, ...rest } = props || {};
        
        // Convert string 'true'/'false' to boolean for React props
        const fullWidth = props.fullWidth === 'true' || props.fullWidth === true;
        
        return React.createElement('textarea', {
          style: {
            width: fullWidth ? '100%' : 'auto',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            minHeight: '80px',
            resize: 'vertical',
            ...(style || {})
          },
          id,
          value,
          onChange,
          rows,
          ...rest
        });
      }
    ),
    defaultProps: {
      rows: 3,
      fullWidth: 'true',
      placeholder: '',
      style: {}
    }
  });
  
  // Register select component
  registerComponent({
    name: 'select',
    getComponent: () => import('./components/basic/Select').then(module => module.default),
    defaultProps: {
      options: [],
      value: '',
      placeholder: 'Select an option',
      disabled: false,
      required: false
    }
  });
  
  // Register Radio Group component
  registerComponent({
    name: 'radio-group',
    getComponent: () => Promise.resolve(createFallbackComponent('radio-group')),
    defaultProps: {
      options: [],
      inline: 'false',
      disabled: 'false'
    }
  });
  
  // Register Toggle component
  registerComponent({
    name: 'toggle',
    getComponent: () => Promise.resolve(createFallbackComponent('toggle')),
    defaultProps: {
      checked: 'false',
      labelPosition: 'right',
      disabled: 'false'
    }
  });
  
  // Register Form component
  registerComponent({
    name: 'form',
    getComponent: () => Promise.resolve(createFallbackComponent('form')),
    defaultProps: {
      submitButtonText: 'Submit'
    }
  });
  
  // Register Checkbox component
  registerComponent({
    name: 'checkbox',
    getComponent: () => Promise.resolve(createFallbackComponent('checkbox')),
    defaultProps: {
      checked: 'false'
    }
  });
  
  // Register Image component
  registerComponent({
    name: 'image',
    getComponent: () => Promise.resolve(createFallbackComponent('image')),
    defaultProps: {
      alt: '',
      objectFit: 'cover'
    }
  });
  
  // Register Alert component
  registerComponent({
    name: 'alert',
    getComponent: () => Promise.resolve(createFallbackComponent('alert')),
    defaultProps: {
      type: 'info',
      dismissible: 'false'
    }
  });
  
  // Register Progress component
  registerComponent({
    name: 'progress',
    getComponent: () => Promise.resolve(createFallbackComponent('progress')),
    defaultProps: {
      type: 'bar',
      value: 0,
      max: 100,
      showValue: 'false',
      size: 'medium'
    }
  });
  
  // Register Date Picker component
  registerComponent({
    name: 'date-picker',
    getComponent: () => Promise.resolve(createFallbackComponent('date-picker')),
    defaultProps: {
      format: 'YYYY-MM-DD',
      disabled: 'false'
    }
  });
  
  // Register File Upload component
  registerComponent({
    name: 'file-upload',
    getComponent: () => Promise.resolve(createFallbackComponent('file-upload')),
    defaultProps: {
      multiple: 'false',
      disabled: 'false'
    }
  });
  
  // Register Tooltip component
  registerComponent({
    name: 'tooltip',
    getComponent: () => Promise.resolve(createFallbackComponent('tooltip')),
    defaultProps: {
      position: 'top',
      arrow: 'true',
      delay: 0,
      trigger: 'hover'
    }
  });
  
  // Register Divider component
  registerComponent({
    name: 'divider',
    getComponent: () => Promise.resolve(createFallbackComponent('divider')),
    defaultProps: {
      orientation: 'horizontal',
      withText: 'false'
    }
  });
  
  // Register Modal component
  registerComponent({
    name: 'modal',
    getComponent: () => Promise.resolve(createFallbackComponent('modal')),
    defaultProps: {
      open: 'false',
      size: 'medium',
      closeOnBackdropClick: 'true',
      showCloseButton: 'true',
      showFooter: 'true'
    }
  });
  
  // Register List component
  registerComponent({
    name: 'list',
    getComponent: () => Promise.resolve(
      function ListComponent(props) {
        // Destructure properties correctly, now expecting items directly
        const { 
          items = [], // Get items directly, default to empty array
          itemTemplate, // Get itemTemplate directly
          children, 
          style = {}, 
          id, // Capture ID for logging
          ...rest 
        } = props || {};
        
        // Template comes directly from props now
        const template = itemTemplate;

        // --- DEBUG LOG --- 
        console.log(`ListComponent ${id}: Received props.items:`, props?.items); // Log the received prop directly
        console.log(`ListComponent ${id}: Rendering with items array:`, items); // items is now directly destructured
        // --- END DEBUG LOG ---
        
        console.log(`Rendering list component ${id} with ${items.length} items.`);
        
        return React.createElement('ul', {
          style: {
            listStyleType: 'none',
            padding: 0,
            margin: 0,
            ...(style || {})
          },
          ...rest
        }, 
        // Map over items array and render based on template
        Array.isArray(items) ? items.map((item, index) => {
          // Use the item's ID if it exists (it should if generated from template), otherwise generate a key
          const itemKey = (typeof item === 'object' && item?.id) ? item.id : `${id}-item-${index}`;
          
          // Check the type of the item in the array
          if (typeof item === 'string') {
            // If item is a string, render it directly
            return React.createElement('li', { key: itemKey }, item);
          } else if (typeof item === 'object' && item !== null) {
            // If item is an object (generated from template by addItem),
            // render it using DynamicComponent
            return React.createElement('li', { key: itemKey }, 
              React.createElement(DynamicComponent, {
                component: item, // Pass the actual item object directly
                eventHandlers: props.eventHandlers // Pass handlers down
              })
            );
          } else {
            // Handle unexpected item types (null, undefined, etc.)
            console.warn(`ListComponent ${id}: Skipping invalid item at index ${index}:`, item);
            return null;
          }
        }) : children // Fallback to original children if items is not an array
        );
      }
    ),
    defaultProps: {
      className: '',
      style: {},
      disabled: 'false'
    }
  });
  
  // Register Tabs component
  registerComponent({
    name: 'tabs',
    getComponent: () => Promise.resolve(createFallbackComponent('tabs')),
    defaultProps: {
      tabs: [],
      activeTab: 0
    }
  });
  
  // Register Card component
  registerComponent({
    name: 'card',
    // Use dynamic import to load the Card component lazily
    getComponent: () => import('./components/layout/Card').then(module => {
       // Check if the default export exists and is a valid component
       if (module && module.default && typeof module.default === 'function') {
           return module.default;
       } else {
           console.error('Failed to load Card component or invalid format');
           return createFallbackComponent('card'); // Return fallback if load fails
       }
    }).catch(error => {
        console.error('Error loading Card component:', error);
        return createFallbackComponent('card'); // Return fallback on error
    }),
    defaultProps: {
      elevation: 1
    }
  });
  
  // Register lowercase 'chart' component
  registerComponent({
    name: 'chart',
    getComponent: () => Promise.resolve(AdvancedChart),
    defaultProps: {
      type: 'bar',
      data: [],
      height: 300,
      width: '100%'
    }
  });

  // Register Canvas component (proper implementation)
  registerComponent({
    name: 'canvas',
    getComponent: () => import('./components/basic/Canvas').then(module => module.default),
    defaultProps: {
      width: 300,
      height: 150,
      style: {}
    }
  });

  // Register all chart components
  registerComponent({
    name: 'linechart',
    getComponent: () => Promise.resolve(LineChart),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 300,
      width: '100%',
      title: '',
      subtitle: '',
      xKey: 'x',
      yKey: 'y',
      lineColor: '#4E79A7',
      gridLines: 'true',
      showLegend: 'true',
      pointStyles: 'circle',
      interaction: {}
    },
    transformProps: (props) => ({
      ...props,
      data: props.data || [],
      height: props.height || 300,
      width: props.width || '100%'
    })
  });
  
  registerComponent({
    name: 'barchart',
    getComponent: () => Promise.resolve(BarChart),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 300,
      width: '100%',
      title: '',
      subtitle: '',
      xKey: 'x',
      yKey: 'y',
      barColors: ['#4E79A7', '#F28E2B', '#E15759'],
      gridLines: 'true',
      showLegend: 'true',
      interaction: {}
    }
  });
  
  registerComponent({
    name: 'piechart',
    getComponent: () => Promise.resolve(PieChart),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 300,
      width: '100%',
      title: '',
      subtitle: '',
      labelKey: 'label',
      valueKey: 'value',
      colors: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948'],
      showLegend: 'true',
      donut: 'false',
      interaction: {}
    }
  });
  
  registerComponent({
    name: 'datagrid',
    getComponent: () => Promise.resolve(DataGrid),
    defaultProps: {
      data: [],
      dataUrl: '',
      height: 400,
      width: '100%',
      title: '',
      columns: [],
      pagination: 'true',
      pageSize: 10,
      sortable: 'true',
      filterable: 'true',
      selectable: 'false',
      exportable: 'false',
      theme: 'light'
    }
  });
  
  registerComponent({
    name: 'advancedchart',
    getComponent: () => Promise.resolve(AdvancedChart),
    defaultProps: {
      data: [],
      type: 'line',
      xKey: 'x',
      yKey: 'y',
      height: 300,
      libraryPreference: 'any',
      theme: 'light'
    }
  });
  
  registerComponent({
    name: 'dataSeries',
    getComponent: () => Promise.resolve(DataSeriesChart),
    defaultProps: {
      data: [],
      type: 'line',
      xKey: 'x',
      yKey: 'y',
      height: 300,
      libraryPreference: 'any',
      theme: 'light'
    }
  });
  
  // Also register all-lowercase version for case-insensitive matching
  registerComponent({
    name: 'dataseries',
    getComponent: () => Promise.resolve(DataSeriesChart),
    defaultProps: {
      data: [],
      type: 'line',
      xKey: 'x',
      yKey: 'y',
      height: 300,
      libraryPreference: 'any',
      theme: 'light'
    }
  });
  
  // Register with hyphenated name for kebab-case convention
  registerComponent({
    name: 'data-series',
    getComponent: () => Promise.resolve(DataSeriesChart),
    defaultProps: {
      data: [],
      type: 'line',
      xKey: 'x',
      yKey: 'y',
      height: 300,
      libraryPreference: 'any',
      theme: 'light'
    }
  });

  // Register Video component for media playback and camera access
  registerComponent({
    name: 'Video',
    getComponent: () => Promise.resolve(Video),
    defaultProps: {
      width: '100%',
      height: 'auto',
      autoPlay: false,
      controls: true,
      muted: false,
      useCamera: false,
      facingMode: 'user'
    }
  });
  
  // Also register lowercase 'video' component to match lookup
  registerComponent({
    name: 'video',
    getComponent: () => Promise.resolve(Video),
    defaultProps: {
      width: '100%',
      height: 'auto',
      autoPlay: false,
      controls: true,
      muted: false,
      useCamera: false,
      facingMode: 'user'
    }
  });

  // --- Add registrations for header, footer, script ---
  registerComponent({
    name: 'header',
    getComponent: () => Promise.resolve(
      function HeaderComponent(props) {
        const { children, style = {}, ...rest } = props || {};
        return React.createElement('header', { style, ...rest }, children);
      }
    ),
    defaultProps: {}
  });

  registerComponent({
    name: 'footer',
    getComponent: () => Promise.resolve(
      function FooterComponent(props) {
        const { children, style = {}, ...rest } = props || {};
        return React.createElement('footer', { style, ...rest }, children);
      }
    ),
    defaultProps: {}
  });

  registerComponent({
    name: 'script',
    getComponent: () => Promise.resolve(
      function ScriptPlaceholderComponent(props) {
        const code = props?.properties?.code || props?.code || '[no code property found]';
        console.warn('Placeholder <script> component rendered. AI generated code was NOT executed for security:', code.substring(0, 100) + '...');
        // Render nothing visible, or an HTML comment
        return React.createElement(React.Fragment, null);
        // Alternatively: return React.createElement(React.Fragment, null, `<!-- Script component ignored: ${props.id} -->`);
      }
    ),
    defaultProps: {}
  });
  // --- End registrations ---
}

/**
 * Create a fallback component for when a registered component fails to load
 */
export function createFallbackComponent(componentType: string) {
  return function FallbackComponent(props: Record<string, any>) {
    // Enhanced debugging output - also log to console with more context
    console.error(`Fallback component being rendered for type "${componentType}". This means the component is registered but the implementation is not available.`);

    // Get list of available components for better debugging
    const { getRegisteredComponents } = require('./ComponentFactory');
    const availableComponents = getRegisteredComponents();
    
    console.error(`Available registered components (${availableComponents.length}):`, availableComponents.sort().join(', '));
    
    // --- Avoid logging potentially circular props --- 
    // Extract only known/safe properties or skip logging complex objects
    const safePropsToLog: Record<string, any> = {};
    for (const key in props) {
        if (Object.prototype.hasOwnProperty.call(props, key)) {
            const value = props[key];
            // Avoid logging children or complex objects/functions that might be circular
            if (key !== 'children' && typeof value !== 'object' && typeof value !== 'function') {
                safePropsToLog[key] = value;
            }
        }
    }
    console.error(`Component safe props:`, JSON.stringify(safePropsToLog, null, 2));
    // --- End change ---
    
    return React.createElement(
      'div', 
      { 
        style: {
          padding: '10px',
          border: '1px dashed red',
          borderRadius: '4px',
          margin: '5px',
          color: '#721c24',
          backgroundColor: '#f8d7da'
        }
      },
      [
        React.createElement('h4', { key: 'title' }, `Component Not Available: ${componentType}`),
        React.createElement('div', { key: 'message' }, 
          React.createElement('strong', {}, 'This component is registered but the implementation is not available.')
        ),
        React.createElement('pre', { 
          key: 'props',
          style: { 
            marginTop: '10px', 
            padding: '8px', 
            background: '#f8f9fa', 
            fontSize: '12px' 
          }
        }, JSON.stringify(props, null, 2))
      ]
    );
  };
}

// Register chart components
export function registerChartComponents() {
  registerComponent({
    name: 'chart',
    getComponent: () => Promise.resolve(
      function ChartComponent(props) {
        // Basic chart implementation
        return React.createElement('div', { 
          style: { 
            width: props.width || '100%',
            height: props.height || '300px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f9f9fa'
          }
        }, 'Chart Component - Data Visualization');
      }
    ),
    defaultProps: {
      type: 'bar',
      data: [],
      height: 300,
      width: '100%'
    }
  });
} 