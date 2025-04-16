import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DataSeriesChart from '../components/ui/charts/DataSeriesChart';

// Predefined data series examples that avoid domain-specific implementations
const EXAMPLE_DATA_SERIES = [
  {
    id: 'currency-exchange',
    name: 'Currency Exchange Rates',
    description: 'USD to EUR exchange rates for the last 30 days',
    xKey: 'date',
    yKey: 'rate'
  },
  {
    id: 'weather-temperature',
    name: 'Temperature Trends',
    description: 'Average daily temperatures in New York City for the last 7 days',
    xKey: 'date',
    yKey: 'temperature'
  },
  {
    id: 'stock-market',
    name: 'Market Index',
    description: 'S&P 500 index values for the last 14 days',
    xKey: 'date',
    yKey: 'value'
  },
  {
    id: 'custom',
    name: 'Custom Data Series',
    description: '',
    xKey: 'x',
    yKey: 'y'
  }
];

const DataSeriesPage: React.FC = () => {
  const [selectedSeries, setSelectedSeries] = useState(EXAMPLE_DATA_SERIES[0]);
  const [customDescription, setCustomDescription] = useState('');
  const [customXKey, setCustomXKey] = useState('date');
  const [customYKey, setCustomYKey] = useState('value');
  const [dataPoints, setDataPoints] = useState(10);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // Get the current data series configuration
  const currentConfig = selectedSeries.id === 'custom' 
    ? {
        ...selectedSeries,
        description: customDescription,
        xKey: customXKey,
        yKey: customYKey
      }
    : selectedSeries;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Data Series Visualization</h1>
        <Link 
          to="/" 
          className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300 transition-colors"
        >
          Back to Home
        </Link>
      </div>
      
      <div className="mb-6 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-800 mb-3">Generic Data Series Visualization</h2>
        <p className="text-gray-700 mb-3">
          This component uses AI with search capabilities to visualize any type of data series.
          Select a predefined series or create your own custom visualization by describing the data you want to see.
        </p>
        <p className="text-gray-700">
          The data is fetched using AI-powered search, with proper attribution to sources. This generic approach
          avoids hard-coding domain-specific components (like BitcoinChart or WeatherWidget) while enabling
          visualization of any type of data.
        </p>
      </div>
      
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Visualization Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Series Type
            </label>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_DATA_SERIES.map(series => (
                <button
                  key={series.id}
                  onClick={() => setSelectedSeries(series)}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    selectedSeries.id === series.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {series.name}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="chartType"
                  value="line"
                  checked={chartType === 'line'}
                  onChange={() => setChartType('line')}
                />
                <span className="ml-2">Line</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="chartType"
                  value="bar"
                  checked={chartType === 'bar'}
                  onChange={() => setChartType('bar')}
                />
                <span className="ml-2">Bar</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Points
            </label>
            <input
              type="range"
              min="5"
              max="30"
              value={dataPoints}
              onChange={(e) => setDataPoints(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5</span>
              <span>{dataPoints}</span>
              <span>30</span>
            </div>
          </div>
        </div>
        
        {/* Custom series controls */}
        {selectedSeries.id === 'custom' && (
          <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h4 className="font-medium mb-3">Custom Data Series Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Description
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="E.g., Gold prices in USD for the last 14 days"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X-Axis Key
                  </label>
                  <input
                    type="text"
                    value={customXKey}
                    onChange={(e) => setCustomXKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="E.g., date"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Y-Axis Key
                  </label>
                  <input
                    type="text"
                    value={customYKey}
                    onChange={(e) => setCustomYKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="E.g., price"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Chart visualization */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          {currentConfig.description ? (
            <DataSeriesChart
              dataDescription={currentConfig.description}
              xKey={currentConfig.xKey}
              yKey={currentConfig.yKey}
              chartType={chartType}
              title={selectedSeries.id === 'custom' ? "Custom Data Visualization" : selectedSeries.name}
              subtitle={`Showing ${dataPoints} data points`}
              height={500}
              dataPoints={dataPoints}
              colorScheme={['#3B82F6']}
              formatters={{
                yAxis: (value) => {
                  // Generic formatter that handles currency if it looks like a price
                  if (currentConfig.yKey.includes('price') || 
                      currentConfig.yKey.includes('rate') ||
                      currentConfig.yKey.includes('value')) {
                    return `$${value}`;
                  }
                  // Handle temperature
                  if (currentConfig.yKey.includes('temp')) {
                    return `${value}°`;
                  }
                  return value;
                },
                tooltip: (value) => {
                  // Generic formatter that handles currency if it looks like a price
                  if (currentConfig.yKey.includes('price') || 
                      currentConfig.yKey.includes('rate') ||
                      currentConfig.yKey.includes('value')) {
                    return `$${value.toLocaleString()}`;
                  }
                  // Handle temperature
                  if (currentConfig.yKey.includes('temp')) {
                    return `${value}°`;
                  }
                  return value;
                }
              }}
            />
          ) : (
            <div className="flex justify-center items-center h-64 text-gray-500">
              Please enter a data description to visualize
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>This component uses a domain-agnostic approach with AI-powered data retrieval</p>
      </div>
    </div>
  );
};

export default DataSeriesPage; 