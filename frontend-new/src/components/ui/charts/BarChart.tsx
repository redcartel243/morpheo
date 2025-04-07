import React, { useState, useEffect } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import axios from 'axios';

export interface DataPoint {
  [key: string]: any;
}

export interface BarChartProps {
  id?: string;
  className?: string;
  data?: DataPoint[];
  dataUrl?: string;
  width?: number | string;
  height?: number | string;
  dataKey?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  barColor?: string;
  barColors?: string[];
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
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
  transformData?: (data: any) => DataPoint[];
  barSize?: number;
  maxBarSize?: number;
  isStacked?: boolean;
  secondaryDataKey?: string;
  secondaryBarColor?: string;
  layout?: 'horizontal' | 'vertical';
  enableColorByValue?: boolean;
  colorThreshold?: number;
  highValueColor?: string;
  lowValueColor?: string;
  labelPosition?: 'top' | 'center' | 'bottom' | 'insideTop' | 'insideBottom';
  showLabels?: boolean;
  barGap?: number;
  roundedBars?: boolean;
  onClick?: (data: any, index: number) => void;
}

const BarChart: React.FC<BarChartProps> = ({
  id,
  className = '',
  data: initialData,
  dataUrl,
  width = '100%',
  height = 300,
  dataKey = 'value',
  xAxisKey = 'name',
  barColor = '#8884d8',
  barColors,
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
  xAxisTickFormatter,
  yAxisTickFormatter,
  transformData,
  barSize,
  maxBarSize,
  isStacked = false,
  secondaryDataKey,
  secondaryBarColor = '#82ca9d',
  layout = 'vertical',
  enableColorByValue = false,
  colorThreshold,
  highValueColor = '#ff0000',
  lowValueColor = '#0000ff',
  labelPosition,
  showLabels = false,
  barGap,
  roundedBars = false,
  onClick
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
          [dataKey]: typeof value === 'object' && value !== null ? 
            (dataKey in value ? value[dataKey as keyof typeof value] : value) : 
            value
        }));
      }
    }

    console.error('Unable to parse data format', rawData);
    return [];
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

  // Function to get color for bar based on value
  const getBarColor = (entry: DataPoint, index: number) => {
    // Use barColors array if provided
    if (barColors && barColors.length > 0) {
      return barColors[index % barColors.length];
    }
    
    // Color by value if enabled
    if (enableColorByValue && typeof entry[dataKey] === 'number') {
      const value = entry[dataKey];
      const threshold = colorThreshold !== undefined ? colorThreshold : 
        Math.max(...data.map(item => Number(item[dataKey] || 0))) / 2;
      
      return value >= threshold ? highValueColor : lowValueColor;
    }
    
    // Default color
    return barColor;
  };

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

  // Function to handle click events
  const handleClick = (data: any, index: number) => {
    if (onClick) {
      onClick(data, index);
    }
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
        <RechartsBarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          layout={layout}
          barCategoryGap={barGap}
          barGap={barGap}
          onClick={handleClick}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          
          {showXAxis && (
            <XAxis 
              dataKey={xAxisKey} 
              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5 } : undefined}
              tickFormatter={xAxisTickFormatter}
              axisLine={true}
              tick={{ fontSize: 12 }}
            />
          )}
          
          {showYAxis && (
            <YAxis 
              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
              tickFormatter={yAxisTickFormatter}
              axisLine={true}
              tick={{ fontSize: 12 }}
            />
          )}
          
          {showTooltip && <Tooltip formatter={formatter} />}
          {showLegend && <Legend />}
          
          <Bar
            dataKey={dataKey}
            fill={barColor}
            barSize={barSize}
            maxBarSize={maxBarSize}
            isAnimationActive={animationDuration > 0}
            animationDuration={animationDuration}
            radius={roundedBars ? [5, 5, 0, 0] : undefined}
            label={showLabels ? { position: labelPosition || 'top', fontSize: 12 } : undefined}
          >
            {(barColors || enableColorByValue) && data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry, index)} />
            ))}
          </Bar>
          
          {secondaryDataKey && (
            <Bar 
              dataKey={secondaryDataKey} 
              fill={secondaryBarColor}
              stackId={isStacked ? "stack" : undefined}
              barSize={barSize}
              maxBarSize={maxBarSize}
              isAnimationActive={animationDuration > 0}
              animationDuration={animationDuration}
              radius={roundedBars ? [5, 5, 0, 0] : undefined}
              label={showLabels ? { position: labelPosition || 'top', fontSize: 12 } : undefined}
            />
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart; 