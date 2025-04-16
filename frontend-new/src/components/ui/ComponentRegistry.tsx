import React from 'react';

// Import chart components
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import DataGrid from './charts/DataGrid';
import AdvancedChart from './charts/AdvancedChart';
import ChartGenerator from './charts/ChartGenerator';
import DataSeriesChart from './charts/DataSeriesChart';

// ... existing code ...

// Inside registerBuiltInComponents, add a new registration for BitcoinChartComponent
export function registerBuiltInComponents(): void {
  // ... existing registrations ...

  // Register AdvancedChart
  registry.register('AdvancedChart', {
    component: AdvancedChart,
    props: {},
    renderer: (props: any) => {
      const validProps = {
        ...props,
        data: props.data || [],
        dataUrl: props.dataUrl,
        type: props.type || 'line', 
        xKey: props.xKey || 'x',
        yKey: props.yKey || 'y',
        title: props.title,
        subtitle: props.subtitle,
        height: props.height || 300,
        width: props.width || '100%',
        libraryPreference: props.libraryPreference || 'chart.js',
        colorScheme: props.colorScheme,
        options: props.options || {},
        theme: props.theme || 'light'
      };
      return React.createElement(AdvancedChart, validProps);
    }
  });

  // Register ChartGenerator
  registry.register('ChartGenerator', {
    component: ChartGenerator,
    props: {},
    renderer: (props: any) => {
      const validProps = {
        ...props,
        className: props.className || ''
      };
      return React.createElement(ChartGenerator, validProps);
    }
  });
  
  // Register DataSeriesChart - a domain-agnostic data visualization component
  registry.register('dataSeries', {
    component: DataSeriesChart,
    props: {
      dataDescription: '',
      xKey: 'x',
      yKey: 'y'
    },
    renderer: (props: any) => {
      // Convert string values to appropriate types
      const validProps = {
        ...props,
        dataDescription: props.dataDescription || '',
        xKey: props.xKey || 'x',
        yKey: props.yKey || 'y',
        chartType: props.chartType || 'line',
        title: props.title,
        subtitle: props.subtitle,
        height: props.height ? Number(props.height) : 400,
        width: props.width,
        dataPoints: props.dataPoints ? Number(props.dataPoints) : 10,
        refreshInterval: props.refreshInterval ? Number(props.refreshInterval) : 0,
        colorScheme: props.colorScheme ? 
          (Array.isArray(props.colorScheme) ? props.colorScheme : [props.colorScheme]) : 
          undefined,
        theme: props.theme || 'light',
        sortBy: props.sortBy || 'x',
        sortDirection: props.sortDirection || 'asc'
      };
      
      // Handle formatter functions if specified as strings
      if (props.formatters) {
        validProps.formatters = {};
        
        if (props.formatters.xAxis && typeof props.formatters.xAxis === 'string') {
          try {
            validProps.formatters.xAxis = new Function('value', `return ${props.formatters.xAxis}`);
          } catch (e) {
            console.error('Invalid xAxis formatter function', e);
          }
        }
        
        if (props.formatters.yAxis && typeof props.formatters.yAxis === 'string') {
          try {
            validProps.formatters.yAxis = new Function('value', `return ${props.formatters.yAxis}`);
          } catch (e) {
            console.error('Invalid yAxis formatter function', e);
          }
        }
        
        if (props.formatters.tooltip && typeof props.formatters.tooltip === 'string') {
          try {
            validProps.formatters.tooltip = new Function('value', `return ${props.formatters.tooltip}`);
          } catch (e) {
            console.error('Invalid tooltip formatter function', e);
          }
        }
      }
      
      return React.createElement(DataSeriesChart, validProps);
    }
  });

  // ... rest of the registrations ...
} 