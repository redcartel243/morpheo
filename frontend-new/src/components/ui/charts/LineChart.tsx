import React, { useState, useEffect } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

export interface DataPoint {
  [key: string]: any;
}

export interface LineChartProps {
  id?: string;
  className?: string;
  data?: DataPoint[];
  dataUrl?: string;
  width?: number | string;
  height?: number | string;
  dataKey?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  lineColor?: string;
  title?: string;
  subtitle?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  animationDuration?: number;
  refreshInterval?: number;
  pollingEnabled?: boolean;
  onDataLoad?: (data: DataPoint[]) => void;
  onError?: (error: Error) => void;
  formatter?: (value: any) => string;
  dateFormat?: string;
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
  transformData?: (data: any) => DataPoint[];
  lineType?: 'linear' | 'monotone' | 'step' | 'stepAfter' | 'stepBefore' | 'natural';
  strokeWidth?: number;
  secondaryDataKey?: string;
  secondaryLineColor?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  id,
  className = '',
  data: initialData,
  dataUrl,
  width = '100%',
  height = 300,
  dataKey = 'value',
  xAxisKey = 'name',
  lineColor = '#8884d8',
  title,
  subtitle,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  xAxisLabel,
  yAxisLabel,
  animationDuration = 300,
  refreshInterval = 0,
  pollingEnabled = false,
  onDataLoad,
  onError,
  formatter,
  dateFormat,
  xAxisTickFormatter,
  yAxisTickFormatter,
  transformData,
  lineType = 'monotone',
  strokeWidth = 2,
  secondaryDataKey,
  secondaryLineColor = '#82ca9d'
}) => {
  const [data, setData] = useState<DataPoint[]>(initialData || []);
  const [loading, setLoading] = useState<boolean>(!!dataUrl);
  const [error, setError] = useState<Error | null>(null);

  // Function to format data
  const formatData = (rawData: any): DataPoint[] => {
    if (transformData) {
      return transformData(rawData);
    }

    // If the data is an array, return it directly
    if (Array.isArray(rawData)) {
      // If array contains date strings, try to parse them
      if (rawData.length > 0 && rawData[0][xAxisKey] && typeof rawData[0][xAxisKey] === 'string' && 
          (rawData[0][xAxisKey].includes('-') || rawData[0][xAxisKey].includes('/')) &&
          !dateFormat) {
        // This is likely a date format, try to parse it
        return rawData.map(item => ({
          ...item,
          // Keep the original value but parse it for display
          originalDate: item[xAxisKey]
        }));
      }
      return rawData;
    }

    // If data is an object with a data property that is an array
    if (rawData && typeof rawData === 'object' && Array.isArray(rawData.data)) {
      return rawData.data;
    }

    // If data is an object with properties
    if (rawData && typeof rawData === 'object') {
      const entries = Object.entries(rawData);
      if (entries.length > 0) {
        // Try to convert object to array of data points
        return entries.map(([key, value]) => ({
          [xAxisKey]: key,
          [dataKey]: value
        }));
      }
    }

    console.error('Unable to parse data format', rawData);
    return [];
  };

  // Function to format date values
  const formatDateValue = (value: any): string => {
    if (typeof value === 'string' && (value.includes('-') || value.includes('/'))) {
      try {
        const date = new Date(value);
        // Format as MM/DD by default or use dateFormat if provided
        return dateFormat ? 
          new Intl.DateTimeFormat('en-US', JSON.parse(dateFormat)).format(date) : 
          `${date.getMonth() + 1}/${date.getDate()}`;
      } catch (e) {
        return value;
      }
    }
    return value;
  };

  // Function to fetch data
  const fetchData = async () => {
    if (!dataUrl) return;

    try {
      setLoading(true);
      const response = await axios.get(dataUrl);
      const formattedData = formatData(response.data);
      setData(formattedData);
      setError(null);
      if (onDataLoad) onDataLoad(formattedData);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err as Error);
      if (onError) onError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (dataUrl) {
      fetchData();
    }
  }, [dataUrl]);

  // Set up polling if enabled
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (pollingEnabled && refreshInterval > 0 && dataUrl) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingEnabled, refreshInterval, dataUrl]);

  // Update data if initialData changes
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  if (loading && data.length === 0) {
    return (
      <div 
        id={id} 
        className={`flex items-center justify-center h-${typeof height === 'number' ? height : 64} ${className}`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div 
        id={id} 
        className={`flex items-center justify-center h-${typeof height === 'number' ? height : 64} text-red-500 ${className}`}
      >
        <div>Error loading chart data. Please try again.</div>
      </div>
    );
  }

  // Create date formatter function based on dateFormat prop
  const getTickFormatter = () => {
    if (xAxisTickFormatter) return xAxisTickFormatter;
    if (dateFormat) return formatDateValue;
    return undefined;
  };

  return (
    <div id={id} className={`flex flex-col ${className}`}>
      {title && (
        <div className="text-lg font-semibold text-center mb-1">{title}</div>
      )}
      {subtitle && (
        <div className="text-sm text-gray-500 text-center mb-4">{subtitle}</div>
      )}
      <ResponsiveContainer width={width} height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          
          {showXAxis && (
            <XAxis 
              dataKey={xAxisKey} 
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottomRight', offset: -10 } : undefined}
              tickFormatter={getTickFormatter()}
            />
          )}
          
          {showYAxis && (
            <YAxis 
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
              tickFormatter={yAxisTickFormatter}
            />
          )}
          
          {showTooltip && <Tooltip formatter={formatter} />}
          {showLegend && <Legend />}
          
          <Line
            type={lineType}
            dataKey={dataKey}
            stroke={lineColor}
            activeDot={{ r: 8 }}
            strokeWidth={strokeWidth}
            isAnimationActive={animationDuration > 0}
          />
          
          {secondaryDataKey && (
            <Line
              type={lineType}
              dataKey={secondaryDataKey}
              stroke={secondaryLineColor}
              strokeWidth={strokeWidth}
              isAnimationActive={animationDuration > 0}
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart; 