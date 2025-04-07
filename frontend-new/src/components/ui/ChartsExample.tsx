import React from 'react';
import { Link } from 'react-router-dom';

const ChartsExample: React.FC = () => {
  const chartExamples = [
    {
      id: 'bitcoin-chart',
      name: 'Bitcoin Price Chart',
      description: 'Display Bitcoin price data for the last 7 days with statistics',
      path: '/bitcoin-chart',
    },
    {
      id: 'line-chart',
      name: 'Line Chart',
      description: 'Basic line chart example with time series data',
      path: '/examples/chart-example',
    },
    {
      id: 'bar-chart',
      name: 'Bar Chart',
      description: 'Visualize categorical data with a bar chart',
      path: '/examples/chart-example',
    },
    {
      id: 'pie-chart',
      name: 'Pie Chart',
      description: 'Show proportional data with an interactive pie chart',
      path: '/examples/chart-example',
    },
    {
      id: 'data-grid',
      name: 'Data Grid',
      description: 'Display tabular data with sorting and filtering capabilities',
      path: '/examples/chart-example',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Morpheo Chart Examples</h1>
      <p className="text-lg text-gray-700 mb-8">
        Explore these examples of Morpheo's data visualization capabilities. Each example demonstrates how to use the chart components for different use cases.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chartExamples.map((example) => (
          <div key={example.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="bg-blue-50 p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-blue-800">{example.name}</h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600 mb-4">{example.description}</p>
              <Link 
                to={example.path} 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
              >
                View Example
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h2 className="text-2xl font-semibold mb-4">Creating Your Own Charts</h2>
        <p className="mb-4">
          Morpheo makes it easy to create data visualizations with minimal code. All chart components support:
        </p>
        <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
          <li>Static data arrays or API data fetching</li>
          <li>Automatic data formatting and validation</li>
          <li>Customizable appearance with themes</li>
          <li>Responsive layouts that work on all devices</li>
          <li>Interactive tooltips and legends</li>
          <li>Date and number formatting options</li>
        </ul>
        <p className="text-sm text-gray-500">
          For detailed implementation guidance, check out the chart documentation and the source code for these examples.
        </p>
      </div>
    </div>
  );
};

export default ChartsExample; 