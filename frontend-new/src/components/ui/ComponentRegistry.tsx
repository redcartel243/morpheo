import React from 'react';

// Import chart components
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import DataGrid from './charts/DataGrid';
import BitcoinChartComponent from './BitcoinChartComponent';
import AdvancedChart from './charts/AdvancedChart';

// ... existing code ...

// Inside registerBuiltInComponents, add a new registration for BitcoinChartComponent
export function registerBuiltInComponents(): void {
  // ... existing registrations ...

  // Register BitcoinChartComponent
  registry.register('BitcoinChart', {
    component: BitcoinChartComponent,
    props: {},
    renderer: (props: any) => {
      const validProps = {
        ...props,
        title: props.title || 'Bitcoin Price Chart',
        subtitle: props.subtitle || 'USD value over the last 7 days',
        days: props.days || 7,
        height: props.height || 300,
        width: props.width || '100%',
        lineColor: props.lineColor || '#F7931A',
        showStats: props.showStats !== false,
      };
      return React.createElement(BitcoinChartComponent, validProps);
    }
  });

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

  // ... rest of the registrations ...
} 