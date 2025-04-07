import React, { useState, useEffect } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector
} from 'recharts';
import axios from 'axios';

export interface DataPoint {
  [key: string]: any;
}

export interface PieChartProps {
  id?: string;
  className?: string;
  data?: DataPoint[];
  dataUrl?: string;
  width?: number | string;
  height?: number | string;
  dataKey?: string;
  nameKey?: string;
  colors?: string[];
  title?: string;
  subtitle?: string;
  showTooltip?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'right' | 'bottom' | 'left';
  animationDuration?: number;
  refreshInterval?: number;
  pollingEnabled?: boolean;
  onDataLoad?: (data: DataPoint[]) => void;
  onError?: (error: Error) => void;
  formatter?: (value: any) => string;
  transformData?: (data: any) => DataPoint[];
  innerRadius?: number | string;
  outerRadius?: number | string;
  paddingAngle?: number;
  startAngle?: number;
  endAngle?: number;
  labelLine?: boolean;
  showLabels?: boolean;
  labelPosition?: 'inside' | 'outside';
  activeIndex?: number;
  isDonut?: boolean;
  enableActiveSegment?: boolean;
  onClick?: (data: any, index: number) => void;
  tooltipFormatter?: (value: any, name: string, props: any) => React.ReactNode;
  labelFormatter?: (value: any) => string;
  valueFormatter?: (value: any) => string;
  centerLabel?: string;
  centerSubLabel?: string;
}

// Default colors for pie segments
const DEFAULT_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#8DD1E1', '#A4DE6C', '#D0ED57', '#FAA381'
];

const PieChart: React.FC<PieChartProps> = ({
  id,
  className = '',
  data: initialData,
  dataUrl,
  width = '100%',
  height = 300,
  dataKey = 'value',
  nameKey = 'name',
  colors = DEFAULT_COLORS,
  title,
  subtitle,
  showTooltip = true,
  showLegend = true,
  legendPosition = 'bottom',
  animationDuration = 300,
  refreshInterval = 0,
  pollingEnabled = false,
  onDataLoad,
  onError,
  formatter,
  transformData,
  innerRadius = 0,
  outerRadius = '70%',
  paddingAngle = 0,
  startAngle = 0,
  endAngle = 360,
  labelLine = true,
  showLabels = false,
  labelPosition = 'outside',
  activeIndex,
  isDonut = false,
  enableActiveSegment = false,
  onClick,
  tooltipFormatter,
  labelFormatter,
  valueFormatter,
  centerLabel,
  centerSubLabel
}) => {
  const [data, setData] = useState<DataPoint[]>(initialData || []);
  const [loading, setLoading] = useState<boolean>(!!dataUrl);
  const [error, setError] = useState<Error | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | undefined>(activeIndex);

  // Calculate the correct inner radius value if isDonut is true
  const calculatedInnerRadius = isDonut ? (typeof outerRadius === 'string' ? '50%' : Number(outerRadius) * 0.7) : innerRadius;

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
          [nameKey]: key,
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

  // Update activeSegmentIndex if activeIndex prop changes
  useEffect(() => {
    setActiveSegmentIndex(activeIndex);
  }, [activeIndex]);

  // Custom active shape component for enhanced active segments
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { 
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value 
    } = props;
    
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        {labelLine && (
          <path
            d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
            stroke={fill}
            fill="none"
          />
        )}
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          textAnchor={textAnchor}
          fill="#333"
          fontSize={12}
        >
          {payload[nameKey]}
        </text>
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          dy={18}
          textAnchor={textAnchor}
          fill="#999"
          fontSize={12}
        >
          {valueFormatter ? valueFormatter(value) : value}
          {' '}
          ({(percent * 100).toFixed(2)}%)
        </text>
      </g>
    );
  };

  // Function to handle click events
  const handlePieClick = (data: any, index: number) => {
    if (enableActiveSegment) {
      setActiveSegmentIndex(index === activeSegmentIndex ? undefined : index);
    }
    
    if (onClick) {
      onClick(data, index);
    }
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

  return (
    <div id={id} className={`flex flex-col ${className}`}>
      {title && (
        <div className="text-lg font-semibold text-center mb-1">{title}</div>
      )}
      {subtitle && (
        <div className="text-sm text-gray-500 text-center mb-4">{subtitle}</div>
      )}
      <ResponsiveContainer width={width} height={height}>
        <RechartsPieChart>
          {showTooltip && <Tooltip formatter={tooltipFormatter || formatter} />}
          
          {showLegend && (
            <Legend 
              layout={legendPosition === 'left' || legendPosition === 'right' ? 'vertical' : 'horizontal'}
              verticalAlign={legendPosition === 'top' ? 'top' : legendPosition === 'bottom' ? 'bottom' : 'middle'}
              align={legendPosition === 'left' ? 'left' : legendPosition === 'right' ? 'right' : 'center'}
            />
          )}
          
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={labelLine}
            label={showLabels ? (labelFormatter ? (entry) => labelFormatter(entry[nameKey]) : undefined) : undefined}
            outerRadius={outerRadius}
            innerRadius={calculatedInnerRadius}
            paddingAngle={paddingAngle}
            dataKey={dataKey}
            nameKey={nameKey}
            startAngle={startAngle}
            endAngle={endAngle}
            isAnimationActive={animationDuration > 0}
            animationDuration={animationDuration}
            activeIndex={activeSegmentIndex}
            activeShape={enableActiveSegment ? renderActiveShape : undefined}
            onClick={handlePieClick}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          
          {isDonut && (centerLabel || centerSubLabel) && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="donut-label"
            >
              {centerLabel && (
                <tspan x="50%" dy="-0.5em" fontSize="16" fontWeight="bold">
                  {centerLabel}
                </tspan>
              )}
              {centerSubLabel && (
                <tspan x="50%" dy="1.5em" fontSize="12" fill="#999">
                  {centerSubLabel}
                </tspan>
              )}
            </text>
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart; 