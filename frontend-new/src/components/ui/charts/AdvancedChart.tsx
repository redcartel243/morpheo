import React, { useState, useEffect, useRef } from 'react';

// Remove the module declaration
// declare module 'plotly.js-dist';

type ChartLibrary = 'chart.js' | 'echarts' | 'plotly' | 'any';
type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'radar' | 'heatmap';
type Theme = 'light' | 'dark';

interface ChartDataItem {
  [key: string]: any;
}

interface AdvancedChartProps {
  data: ChartDataItem[];
  type: ChartType;
  xKey: string;
  yKey: string;
  title?: string;
  subtitle?: string;
  height?: number;
  width?: number | string;
  libraryPreference?: ChartLibrary;
  colorScheme?: string[];
  options?: any;
  theme?: Theme;
  className?: string;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({
  data,
  type,
  xKey,
  yKey,
  title,
  subtitle,
  height = 300,
  width,
  libraryPreference = 'any',
  colorScheme,
  options = {},
  theme = 'light',
  className = '',
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [loadedLibrary, setLoadedLibrary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Clean up the chart instance when component unmounts
  useEffect(() => {
    return () => {
      if (chartInstance) {
        if (loadedLibrary === 'chart.js') {
          chartInstance.destroy();
        } else if (loadedLibrary === 'echarts') {
          chartInstance.dispose();
        }
      }
    };
  }, [chartInstance, loadedLibrary]);

  // Dynamic library loading and chart rendering
  useEffect(() => {
    const loadLibraries = async () => {
      setLoading(true);
      setError(null);
      
      // Order of libraries to try - start with preferred library
      const librariesToTry: ChartLibrary[] = 
        libraryPreference === 'any'
          ? ['chart.js', 'echarts', 'plotly']
          : [libraryPreference, 'chart.js', 'echarts', 'plotly'];
      
      let loaded = false;
      
      // Try each library in order until one loads successfully
      for (const library of librariesToTry) {
        if (loaded) break;
        
        try {
          // Load the library based on type
          switch(library) {
            case 'chart.js':
              if (!(window as any).Chart) {
                const module = await import('chart.js/auto');
                (window as any).Chart = module.default || module;
              }
              renderChartJS();
              setLoadedLibrary('chart.js');
              loaded = true;
              break;
              
            case 'echarts':
              if (!(window as any).echarts) {
                const module = await import('echarts' as any);
                (window as any).echarts = module;
              }
              renderECharts();
              setLoadedLibrary('echarts');
              loaded = true;
              break;
              
            case 'plotly':
              if (!(window as any).Plotly) {
                const Plotly = await import('plotly.js-dist' as any);
                (window as any).Plotly = Plotly.default || Plotly;
              }
              renderPlotly();
              setLoadedLibrary('plotly');
              loaded = true;
              break;
          }
        } catch (err) {
          console.warn(`Failed to load ${library}, trying next library...`, err);
        }
      }
      
      // If we get here and nothing loaded, all libraries failed
      if (!loaded) {
        setError('Failed to load any chart library. Please check your connection or try again.');
      }
      
      setLoading(false);
    };

    // Initialize and render Chart.js chart
    const renderChartJS = () => {
      if (!chartContainerRef.current) return;
      
      // Destroy existing chart if any
      if (chartInstance && loadedLibrary === 'chart.js') {
        chartInstance.destroy();
      }
      
      // Set container width if string width is provided
      if (typeof width === 'string' && width) {
        chartContainerRef.current.style.width = width;
      }
      
      const Chart = (window as any).Chart;
      const ctx = document.createElement('canvas');
      chartContainerRef.current.innerHTML = '';
      chartContainerRef.current.appendChild(ctx);
      
      // Map data to Chart.js format
      const chartData = {
        labels: data.map(item => item[xKey]),
        datasets: [{
          label: title || yKey,
          data: data.map(item => item[yKey]),
          backgroundColor: type === 'line' ? 'rgba(75, 192, 192, 0.2)' : colorScheme || [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
          ],
          borderColor: type === 'line' ? 'rgba(75, 192, 192, 1)' : colorScheme?.map(color => color) || [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1
        }]
      };
      
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!title,
            text: title,
          },
          subtitle: {
            display: !!subtitle,
            text: subtitle,
            padding: { top: 10, bottom: 30 }
          },
          legend: {
            display: true,
          },
        },
        ...options,
      };
      
      // Apply dark theme if specified
      if (theme === 'dark') {
        Chart.defaults.color = '#fff';
        Chart.defaults.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        chartOptions.scales = {
          x: { grid: { color: 'rgba(255, 255, 255, 0.1)' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.1)' } }
        };
      } else {
        Chart.defaults.color = '#666';
        Chart.defaults.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      }
      
      // Create chart based on type
      const newChartInstance = new Chart(ctx, {
        type: mapChartType(type, 'chart.js'),
        data: chartData,
        options: chartOptions
      });
      
      setChartInstance(newChartInstance);
    };

    // Initialize and render ECharts chart
    const renderECharts = () => {
      if (!chartContainerRef.current) return;
      
      // Dispose of existing chart if any
      if (chartInstance && loadedLibrary === 'echarts') {
        chartInstance.dispose();
      }
      
      const echarts = (window as any).echarts;
      chartContainerRef.current.innerHTML = '';
      
      // Set container width if string width is provided
      if (typeof width === 'string' && width) {
        chartContainerRef.current.style.width = width;
      }
      
      // Initialize ECharts instance
      const newChartInstance = echarts.init(chartContainerRef.current, theme);
      
      // Prepare options for ECharts
      const echartsOptions: any = {
        title: {
          text: title,
          subtext: subtitle
        },
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: [title || yKey]
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item[xKey])
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: title || yKey,
          type: mapChartType(type, 'echarts'),
          data: data.map(item => item[yKey]),
          itemStyle: {
            color: colorScheme ? colorScheme[0] : undefined
          }
        }],
        ...options
      };
      
      // Special handling for pie charts
      if (type === 'pie') {
        echartsOptions.series[0].data = data.map(item => ({
          name: item[xKey],
          value: item[yKey]
        }));
        delete echartsOptions.xAxis;
        delete echartsOptions.yAxis;
      }
      
      // Set chart options
      newChartInstance.setOption(echartsOptions);
      
      // Handle resize
      window.addEventListener('resize', () => {
        newChartInstance.resize();
      });
      
      setChartInstance(newChartInstance);
    };

    // Initialize and render Plotly.js chart
    const renderPlotly = () => {
      if (!chartContainerRef.current) return;
      chartContainerRef.current.innerHTML = '';
      
      // Set container width if string width is provided
      if (typeof width === 'string' && width) {
        chartContainerRef.current.style.width = width;
      }
      
      const Plotly = (window as any).Plotly;
      
      // Prepare data for Plotly
      const plotlyData = [];
      
      // Basic trace
      const trace: any = {
        x: data.map(item => item[xKey]),
        y: data.map(item => item[yKey]),
        name: title || yKey,
        type: mapChartType(type, 'plotly')
      };
      
      // Set colors if provided
      if (colorScheme && colorScheme.length > 0) {
        if (type === 'bar') {
          trace.marker = { color: colorScheme[0] };
        } else if (type === 'line') {
          trace.line = { color: colorScheme[0] };
        }
      }
      
      plotlyData.push(trace);
      
      // Special handling for pie charts
      if (type === 'pie') {
        plotlyData[0] = {
          values: data.map(item => item[yKey]),
          labels: data.map(item => item[xKey]),
          type: 'pie',
          marker: {
            colors: colorScheme
          }
        };
      }
      
      // Prepare layout
      const layout = {
        title: {
          text: title,
          font: {
            size: 18
          }
        },
        height,
        width: typeof width === 'number' ? width : undefined,
        paper_bgcolor: theme === 'dark' ? '#1a1a1a' : '#fff',
        plot_bgcolor: theme === 'dark' ? '#1a1a1a' : '#fff',
        font: {
          color: theme === 'dark' ? '#fff' : '#333'
        },
        margin: { t: 50, b: 50, l: 50, r: 20 },
        ...options
      };
      
      // Add subtitle if provided
      if (subtitle) {
        layout.title.text += `<br><span style="font-size:14px">${subtitle}</span>`;
      }
      
      // Create new Plotly chart
      Plotly.newPlot(chartContainerRef.current, plotlyData, layout);
    };

    // Map component chart types to library-specific chart types
    const mapChartType = (chartType: ChartType, library: string): string => {
      if (library === 'chart.js') {
        const mapping: Record<ChartType, string> = {
          line: 'line',
          bar: 'bar',
          pie: 'pie',
          scatter: 'scatter',
          area: 'line', // Use line with fill for area
          radar: 'radar',
          heatmap: 'scatter' // Fallback for heatmap
        };
        return mapping[chartType];
      } else if (library === 'echarts') {
        const mapping: Record<ChartType, string> = {
          line: 'line',
          bar: 'bar',
          pie: 'pie',
          scatter: 'scatter',
          area: 'line', // Will add areaStyle in options
          radar: 'radar',
          heatmap: 'heatmap'
        };
        // Add area style for area charts
        if (chartType === 'area') {
          options.areaStyle = options.areaStyle || {};
        }
        return mapping[chartType];
      } else if (library === 'plotly') {
        const mapping: Record<ChartType, string> = {
          line: 'scatter', // scatter with mode: 'lines'
          bar: 'bar',
          pie: 'pie',
          scatter: 'scatter',
          area: 'scatter', // scatter with fill: 'tozeroy'
          radar: 'scatterpolar',
          heatmap: 'heatmap'
        };
        // Configure line and area types
        if (chartType === 'line') {
          options.mode = 'lines+markers';
        } else if (chartType === 'area') {
          options.mode = 'lines';
          options.fill = 'tozeroy';
        }
        return mapping[chartType];
      }
      return chartType;
    };

    // Start the library loading process
    loadLibraries();
    
    // Add window resize event listener
    const handleResize = () => {
      if (chartInstance) {
        if (loadedLibrary === 'echarts') {
          chartInstance.resize();
        }
        // Chart.js and Plotly handle resize automatically
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, type, xKey, yKey, title, subtitle, height, width, libraryPreference, colorScheme, options, theme]);

  return (
    <div 
      className={`advanced-chart-container ${className}`}
      style={{ 
        height: `${height}px`, 
        width: typeof width === 'number' ? `${width}px` : width || '100%', 
        backgroundColor: theme === 'dark' ? '#222' : '#fff',
        padding: '10px',
        borderRadius: '4px'
      }}
    >
      {loading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          color: theme === 'dark' ? '#fff' : '#333'
        }}>
          Loading chart...
        </div>
      )}
      
      {error && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%', 
          color: 'red',
          flexDirection: 'column'
        }}>
          <div>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      <div 
        ref={chartContainerRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          visibility: loading || error ? 'hidden' : 'visible' 
        }}
      />
      
      {loadedLibrary && !loading && !error && (
        <div style={{ 
          fontSize: '10px', 
          textAlign: 'right', 
          marginTop: '5px',
          color: theme === 'dark' ? '#aaa' : '#999'
        }}>
          Powered by {loadedLibrary}
        </div>
      )}
    </div>
  );
};

export default AdvancedChart; 