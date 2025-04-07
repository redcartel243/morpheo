import React from 'react';
import { registerComponent } from './ComponentFactory';

// Import chart components - use correct paths
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import DataGrid from './charts/DataGrid';
import AdvancedChart from './charts/AdvancedChart';

// Import basic components
import { Container, Text, Button } from './BasicComponents';
// Import layout components
import Grid from './components/layout/Grid';
import Card from './components/layout/Card';

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

// Define a fallback component creator function instead of JSX
const createFallbackComponent = (componentType: string): React.FC<FallbackComponentProps> => {
  // Define a proper React functional component
  const FallbackComponent: React.FC<FallbackComponentProps> = (props: FallbackComponentProps) => {
    return React.createElement('div', {
      style: {
        padding: '1rem',
        border: '1px dashed #d0d0d0',
        borderRadius: '4px',
        color: '#666'
      }
    }, [
      React.createElement('p', {}, [
        'Component ',
        React.createElement('strong', {}, componentType),
        ' is registered but the implementation is not available.'
      ]),
      React.createElement('p', {}, `Props: ${JSON.stringify(props)}`)
    ]);
  };
  
  // Return the component function, not the rendered element
  return FallbackComponent;
};

/**
 * Register all available components with the ComponentFactory
 */
export function registerAllComponents() {
  // Register native HTML elements
  const nativeElements = ['div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'canvas'];
  
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
    getComponent: () => Promise.resolve(Container),
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
        const { text, children, style = {}, ...rest } = props || {};
        
        // Make sure to show either text property or children
        const buttonContent = text || children || '';
        
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
        
        return React.createElement('input', {
          type,
          style: {
            width: fullWidth ? '100%' : 'auto',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            ...(style || {})
          },
          id,
          value,
          onChange,
          ...rest
        });
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
  
  // Register Select/Dropdown component
  registerComponent({
    name: 'select',
    getComponent: () => Promise.resolve(createFallbackComponent('select')),
    defaultProps: {
      options: [],
      fullWidth: 'true',
      variant: 'outlined',
      size: 'medium'
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
    getComponent: () => Promise.resolve(createFallbackComponent('list')),
    defaultProps: {
      items: [],
      ordered: 'false'
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
    getComponent: () => Promise.resolve(Card || 
      createFallbackComponent('card')),
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
} 