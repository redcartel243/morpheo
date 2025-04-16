import React, { useState } from 'react';
import { 
  generateChartConfiguration, 
  configToAdvancedChartProps, 
  ChartType, 
  fetchGroundedData,
  GroundingSource,
  DataPoint
} from '../../../services/geminiService';
import AdvancedChart from './AdvancedChart';

interface ChartGeneratorProps {
  className?: string;
}

const ChartGenerator: React.FC<ChartGeneratorProps> = ({ className = '' }) => {
  const [dataDescription, setDataDescription] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chartProps, setChartProps] = useState<Record<string, any> | null>(null);
  const [chartData, setChartData] = useState<DataPoint[] | null>(null);
  const [dataSources, setDataSources] = useState<GroundingSource[] | null>(null);
  const [useDemoData, setUseDemoData] = useState<boolean>(false);

  // Generate a chart based on user input
  const generateChart = async () => {
    if (!dataDescription.trim() || !purpose.trim()) {
      setError('Please provide both a data description and purpose');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Generate chart configuration
      const chartConfig = await generateChartConfiguration(dataDescription, purpose);
      
      // Convert to AdvancedChart props
      const props = configToAdvancedChartProps(chartConfig);
      
      setChartProps(props);
      
      // If using demo data, generate it
      if (useDemoData) {
        const demoData = generateDemoData(chartConfig.chart_type, 10);
        setChartData(demoData);
        setDataSources(null);
      } else {
        // Fetch real-time data with Google Search grounding
        try {
          const { data, sources } = await fetchGroundedData(
            dataDescription,
            chartConfig.x_key,
            chartConfig.y_key,
            10
          );
          
          setChartData(data);
          setDataSources(sources);
        } catch (dataError: any) {
          console.error('Error fetching grounded data:', dataError);
          setError(`Error fetching real-time data: ${dataError.message}. Falling back to demo data.`);
          
          // Fall back to demo data
          const demoData = generateDemoData(chartConfig.chart_type, 10);
          setChartData(demoData);
          setDataSources(null);
        }
      }
    } catch (err: any) {
      console.error('Error generating chart:', err);
      setError(err.message || 'Failed to generate chart configuration');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate demo data for the chart
  const generateDemoData = (chartType: string, count: number) => {
    const data = [];
    
    for (let i = 0; i < count; i++) {
      // Create data points based on chart type
      if (chartType === 'pie') {
        data.push({
          x: `Category ${i + 1}`,
          y: Math.floor(Math.random() * 100)
        });
      } else {
        data.push({
          x: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          y: Math.floor(Math.random() * 100)
        });
      }
    }
    
    return data;
  };

  return (
    <div className={`chart-generator ${className}`}>
      <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-blue-700">AI Chart Generator</h2>
        <p className="text-gray-600 mb-4">
          Describe your data and what you want to visualize, and the AI will generate an appropriate chart configuration.
        </p>
        
        <div className="mb-4">
          <label htmlFor="dataDescription" className="block text-sm font-medium text-gray-700 mb-1">
            Data Description
          </label>
          <textarea
            id="dataDescription"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dataDescription}
            onChange={(e) => setDataDescription(e.target.value)}
            placeholder="Example: Bitcoin price data over the last 7 days in USD"
            rows={3}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
            Visualization Purpose
          </label>
          <textarea
            id="purpose"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Example: Show price trends and identify patterns"
            rows={3}
          />
        </div>
        
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="useDemoData"
            checked={useDemoData}
            onChange={(e) => setUseDemoData(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="useDemoData" className="ml-2 block text-sm text-gray-700">
            Use demo data (turn off real-time data fetching)
          </label>
        </div>
        
        <button
          onClick={generateChart}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Generating...' : 'Generate Chart'}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
      
      {chartProps && chartData && (
        <div className="mt-4 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Generated Chart</h3>
          <div className="h-[500px] w-full">
            {/* Ensure all required props are present */}
            <AdvancedChart
              type={chartProps.type || 'line'}
              xKey={chartProps.xKey || 'x'}
              yKey={chartProps.yKey || 'y'}
              data={chartData}
              title={chartProps.title}
              subtitle={chartProps.subtitle}
              height={chartProps.height}
              width={chartProps.width}
              libraryPreference={chartProps.libraryPreference}
              colorScheme={chartProps.colorScheme}
              theme={chartProps.theme}
              options={chartProps.options}
              className={chartProps.className}
            />
          </div>
          
          <div className="mt-4">
            <h4 className="text-lg font-medium mb-2">Chart Configuration</h4>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(chartProps, null, 2)}
            </pre>
          </div>
          
          {dataSources && dataSources.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-medium mb-2">Data Sources</h4>
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-gray-600 mb-2">
                  This data was retrieved from the following sources:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {dataSources.map((source, index) => (
                    <li key={index} className="text-sm">
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartGenerator; 