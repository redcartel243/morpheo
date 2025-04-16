import React, { useState, useEffect } from 'react';
import { fetchGroundedData, GroundingSource } from '../../../services/geminiService';
import AdvancedChart from './AdvancedChart';

interface DataSeriesChartProps {
  dataDescription: string; // Generic description of the data series to fetch
  xKey: string;
  yKey: string;
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  title?: string;
  subtitle?: string;
  height?: number;
  width?: number | string;
  className?: string;
  colorScheme?: string[];
  theme?: 'light' | 'dark';
  dataPoints?: number;
  refreshInterval?: number; // in ms, 0 means no polling
  formatters?: {
    xAxis?: (value: any) => string;
    yAxis?: (value: any) => string;
    tooltip?: (value: any) => string;
  };
  sortBy?: 'x' | 'y' | 'none';
  sortDirection?: 'asc' | 'desc';
}

interface DataPoint {
  [key: string]: any;
}

const DataSeriesChart: React.FC<DataSeriesChartProps> = ({
  dataDescription,
  xKey,
  yKey,
  chartType = 'line',
  title,
  subtitle,
  height = 400,
  width = '100%',
  className = '',
  colorScheme,
  theme = 'light',
  dataPoints = 10,
  refreshInterval = 0,
  formatters,
  sortBy = 'x',
  sortDirection = 'asc'
}) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to fetch data using AI with grounding
  const fetchDataSeries = async () => {
    try {
      setLoading(true);
      
      // Use AI to fetch the data with grounding
      const { data: fetchedData, sources: dataSources } = await fetchGroundedData(
        dataDescription,
        xKey,
        yKey,
        dataPoints
      );
      
      // Apply sorting if needed
      let processedData = [...fetchedData];
      
      if (sortBy !== 'none') {
        processedData.sort((a, b) => {
          const valA = a[sortBy === 'x' ? xKey : yKey];
          const valB = b[sortBy === 'x' ? xKey : yKey];
          
          // Handle dates
          if (String(valA).match(/^\d{4}-\d{2}-\d{2}/) && String(valB).match(/^\d{4}-\d{2}-\d{2}/)) {
            const dateA = new Date(valA).getTime();
            const dateB = new Date(valB).getTime();
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
          }
          
          // Handle numbers
          if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
            return sortDirection === 'asc' 
              ? Number(valA) - Number(valB) 
              : Number(valB) - Number(valA);
          }
          
          // Handle strings
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === 'asc' 
            ? strA.localeCompare(strB) 
            : strB.localeCompare(strA);
        });
      }
      
      setData(processedData);
      setSources(dataSources);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when key parameters change
  useEffect(() => {
    fetchDataSeries();
    
    // Set up polling if enabled
    let intervalId: NodeJS.Timeout | undefined;
    
    if (refreshInterval > 0) {
      intervalId = setInterval(fetchDataSeries, refreshInterval);
    }
    
    // Clean up
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [dataDescription, xKey, yKey, dataPoints]);

  // Prepare chart options with formatters
  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: formatters?.tooltip 
            ? (context: any) => formatters.tooltip!(context.parsed.y)
            : undefined
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: formatters?.yAxis 
            ? (value: any) => formatters.yAxis!(value)
            : undefined
        }
      },
      x: {
        ticks: {
          callback: formatters?.xAxis 
            ? (value: any) => formatters.xAxis!(value)
            : undefined
        }
      }
    }
  };

  return (
    <div className={`data-series-chart-container ${className}`}>
      {/* Loading state */}
      {loading && data.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Loading data...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && data.length === 0 && (
        <div className="flex flex-col justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={fetchDataSeries}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Chart */}
      {data.length > 0 && (
        <div>
          <AdvancedChart
            data={data}
            type={chartType}
            xKey={xKey}
            yKey={yKey}
            title={title}
            subtitle={subtitle}
            height={height}
            width={width}
            libraryPreference="chart.js"
            colorScheme={colorScheme}
            theme={theme}
            options={chartOptions}
          />
          
          {/* Last updated info */}
          {lastUpdated && (
            <div className="text-right text-sm text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          
          {/* Data sources */}
          {sources.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
              <h4 className="font-medium text-gray-700">Data sources:</h4>
              <ul className="list-disc pl-5 mt-1">
                {sources.map((source, index) => (
                  <li key={index}>
                    <a 
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataSeriesChart; 