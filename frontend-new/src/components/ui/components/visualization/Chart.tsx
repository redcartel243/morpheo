import React, { useEffect, useRef, useState } from 'react';
import { BaseComponentProps } from '../types';
import { Chart as ChartJS, registerables, ChartType as ChartJSType } from 'chart.js';

// Register Chart.js components
ChartJS.register(...registerables);

// Chart types supported by the component
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';

// Data series for the chart
export interface DataSeries {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

// Chart data structure
export interface ChartData {
  labels: string[];
  series: DataSeries[];
}

// Chart styling options
export interface ChartStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  fontFamily?: string;
  titleFontSize?: number;
  axisFontSize?: number;
  labelFontSize?: number;
  grid?: boolean;
  axisTicks?: boolean;
}

// Chart component props
export interface ChartProps extends Omit<BaseComponentProps, 'style'> {
  type: ChartType;
  data: ChartData;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  width?: number | string;
  height?: number | string;
  style?: ChartStyle;
  showLegend?: boolean;
  animation?: boolean;
}

/**
 * Chart component for data visualization
 * Supports bar, line, pie, doughnut, area, and scatter chart types
 */
export const Chart: React.FC<ChartProps> = ({
  type = 'bar',
  data,
  title,
  xAxisLabel,
  yAxisLabel,
  width = '100%',
  height = 400,
  style = {},
  className = '',
  testId = 'chart',
  showLegend = true,
  animation = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartInstance, setChartInstance] = useState<ChartJS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Process data for chart
  const processData = (data: ChartData) => {
    if (!data || !data.series || !data.labels) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Default colors for the chart if not provided
    const defaultColors = [
      'rgba(75, 192, 192, 0.6)',
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(255, 99, 71, 0.6)',
      'rgba(40, 167, 69, 0.6)',
      'rgba(0, 123, 255, 0.6)',
      'rgba(108, 117, 125, 0.6)'
    ];

    const defaultBorderColors = [
      'rgba(75, 192, 192, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(255, 99, 71, 1)',
      'rgba(40, 167, 69, 1)',
      'rgba(0, 123, 255, 1)',
      'rgba(108, 117, 125, 1)'
    ];

    // Convert series data to Chart.js format
    return {
      labels: data.labels,
      datasets: data.series.map((series, index) => {
        // For area charts, set fill to true
        const fill = type === 'area' ? true : undefined;
        
        return {
          label: series.label,
          data: series.data,
          backgroundColor: series.backgroundColor || defaultColors[index % defaultColors.length],
          borderColor: series.borderColor || defaultBorderColors[index % defaultBorderColors.length],
          borderWidth: series.borderWidth || 1,
          fill: series.fill !== undefined ? series.fill : fill
        };
      })
    };
  };

  // Create chart config
  const createChartConfig = (
    type: ChartType,
    data: any,
    title?: string,
    xAxisLabel?: string,
    yAxisLabel?: string,
    showLegend: boolean = true,
    animation: boolean = true,
    style: ChartStyle = {}
  ) => {
    // Map area type to line with fill
    let chartType: ChartJSType = type as ChartJSType;
    if (type === 'area') {
      chartType = 'line';
    }
    
    // Check if chart type needs axes
    const needsAxes = type !== 'pie' && type !== 'doughnut';
    
    return {
      type: chartType,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: animation ? 1000 : 0
        },
        plugins: {
          legend: {
            display: showLegend,
            position: 'top' as const,
          },
          title: {
            display: !!title,
            text: title,
            font: {
              size: style.titleFontSize || 16
            }
          },
          tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false
          }
        },
        scales: needsAxes ? {
          x: {
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel,
              font: {
                size: style.axisFontSize || 12
              }
            },
            grid: {
              display: style.grid !== undefined ? style.grid : true
            },
            ticks: {
              display: style.axisTicks !== undefined ? style.axisTicks : true,
              font: {
                size: style.labelFontSize || 11
              }
            }
          },
          y: {
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel,
              font: {
                size: style.axisFontSize || 12
              }
            },
            grid: {
              display: style.grid !== undefined ? style.grid : true
            },
            ticks: {
              display: style.axisTicks !== undefined ? style.axisTicks : true,
              font: {
                size: style.labelFontSize || 11
              }
            }
          }
        } : undefined
      }
    };
  };

  // Initialize chart
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Get the canvas context
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      setError('Canvas context not available');
      setIsLoading(false);
      return;
    }
    
    // Clean up previous chart instance
    if (chartInstance) {
      chartInstance.destroy();
    }
    
    // Process data for chart
    const processedData = processData(data);
    
    // Check if we have data to display
    if (processedData.datasets.length === 0 || processedData.labels.length === 0) {
      setError('No data available');
      setIsLoading(false);
      return;
    }
    
    try {
      // Create chart config
      const config = createChartConfig(
        type,
        processedData,
        title,
        xAxisLabel,
        yAxisLabel,
        showLegend,
        animation,
        style
      );
      
      // Create the chart
      const newChart = new ChartJS(ctx, config);
      setChartInstance(newChart);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Chart creation error:', err);
      setError('Failed to create chart');
      setIsLoading(false);
    }
    
    // Clean up function
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [type, data, title, xAxisLabel, yAxisLabel, showLegend, animation, style]);

  // Show loading state
  if (isLoading) {
    return (
      <div 
        data-testid={testId}
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: style.backgroundColor || '#f9f9f9',
          border: style.borderColor ? `${style.borderWidth || 1}px solid ${style.borderColor}` : 'none',
          borderRadius: style.borderRadius || 4
        }}
      >
        Loading chart...
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div 
        data-testid={testId}
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: style.backgroundColor || '#f9f9f9',
          border: style.borderColor ? `${style.borderWidth || 1}px solid ${style.borderColor}` : 'none',
          borderRadius: style.borderRadius || 4,
          color: '#dc3545',
          padding: style.padding || 16
        }}
      >
        {error}
      </div>
    );
  }

  // Show chart
  return (
    <div 
      data-testid={testId}
      className={className}
      style={{
        width,
        height,
        backgroundColor: style.backgroundColor,
        border: style.borderColor ? `${style.borderWidth || 1}px solid ${style.borderColor}` : 'none',
        borderRadius: style.borderRadius || 4,
        padding: style.padding || 16,
        fontFamily: style.fontFamily,
        position: 'relative'
      }}
    >
      <canvas
        ref={canvasRef}
        width="100%"
        height="100%"
      />
    </div>
  );
};

export default Chart; 