import React, { useEffect, useRef, useState } from 'react';
import { Container, Text } from '../components/ui/BasicComponents';

interface PopulationData {
  region: string;
  population: number;
  color: string;
}

interface ChartInstance {
  destroy(): void;
}

const POPULATION_DATA: PopulationData[] = [
  { region: 'United States', population: 331.9, color: 'rgba(52, 152, 219, 0.8)' }, // US population in millions
  { region: 'Europe', population: 750.0, color: 'rgba(231, 76, 60, 0.8)' } // Europe population in millions
];

/**
 * Population Comparison Chart Component
 * 
 * This component demonstrates how to use dynamic library loading to create
 * a chart comparing population sizes of the US vs Europe using Chart.js
 */
const PopulationComparisonChart: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [chartInstance, setChartInstance] = useState<ChartInstance | null>(null);

  useEffect(() => {
    // Clean up any existing chart instance
    if (chartInstance) {
      chartInstance.destroy();
      setChartInstance(null);
    }

    // Function to load Chart.js from CDN
    const loadChartJs = async () => {
      try {
        setIsLoading(true);
        
        // If Chart.js is already available, use it
        if (window.Chart) {
          await createChart(window.Chart);
          return;
        }
        
        // Otherwise, dynamically load Chart.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.async = true;
        
        // Create a promise to wait for script to load
        const loadPromise = new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Chart.js'));
        });
        
        // Add script to document
        document.head.appendChild(script);
        
        // Wait for script to load
        await loadPromise;
        
        // Create chart
        await createChart(window.Chart);
      } catch (err) {
        console.error('Error loading Chart.js:', err);
        setError(err instanceof Error ? err : new Error('Failed to load Chart.js'));
        setIsLoading(false);
      }
    };
    
    // Function to create the chart
    const createChart = async (ChartJS: any) => {
      if (!chartRef.current) return;
      
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;
      
      const newChartInstance = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: POPULATION_DATA.map(item => item.region),
          datasets: [{
            label: 'Population (millions)',
            data: POPULATION_DATA.map(item => item.population),
            backgroundColor: POPULATION_DATA.map(item => item.color),
            borderColor: POPULATION_DATA.map(item => item.color.replace('0.8', '1')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Population (millions)'
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  return `${context.dataset.label}: ${context.raw} million`;
                }
              }
            },
            legend: {
              display: false
            }
          },
          animation: {
            duration: 1500,
            easing: 'easeOutQuart'
          }
        }
      });
      
      setChartInstance(newChartInstance);
      setIsLoading(false);
    };
    
    // Load Chart.js
    loadChartJs();
    
    // Cleanup function
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []);
  
  return (
    <Container className="chart-container" style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      borderRadius: '8px'
    }}>
      <Text variant="h2" style={{ textAlign: 'center', marginBottom: '20px' }}>
        Population Comparison: US vs Europe
      </Text>
      
      <Container style={{ position: 'relative', height: '400px' }}>
        {isLoading && (
          <Container style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)'
          }}>
            <Text>Loading chart...</Text>
          </Container>
        )}
        
        {error && (
          <Container style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.8)'
          }}>
            <Text style={{ color: 'red', marginBottom: '10px' }}>
              Error loading chart: {error.message}
            </Text>
          </Container>
        )}
        
        <canvas ref={chartRef} />
      </Container>
      
      <Container style={{ 
        marginTop: '20px', 
        fontSize: '0.9rem', 
        color: '#666',
        textAlign: 'center'
      }}>
        <Text>Data source: Approximate population figures for 2023 (in millions)</Text>
      </Container>
    </Container>
  );
};

// Add Chart to global Window interface
declare global {
  interface Window {
    Chart: any;
  }
}

export default PopulationComparisonChart; 