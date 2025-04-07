import React, { useEffect, useRef, useState } from 'react';

/**
 * A very simplified chart component that directly loads Chart.js
 */
const SimplifiedChart: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Load Chart.js directly
    const loadChart = async () => {
      try {
        // If Chart.js is already in window object, skip loading
        if (!(window as any).Chart) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
          script.async = true;
          
          const loadPromise = new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Chart.js'));
          });
          
          document.head.appendChild(script);
          await loadPromise;
        }
        
        // Chart.js should now be loaded
        const Chart = (window as any).Chart;
        
        // Get canvas context
        if (!chartRef.current) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        // Create chart
        const chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['United States', 'Europe'],
            datasets: [{
              label: 'Population (millions)',
              data: [331.9, 750.0],
              backgroundColor: ['rgba(52, 152, 219, 0.8)', 'rgba(231, 76, 60, 0.8)'],
              borderColor: ['rgba(52, 152, 219, 1)', 'rgba(231, 76, 60, 1)'],
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
            }
          }
        });
        
        setIsLoading(false);
        
        // Clean up on unmount
        return () => {
          chartInstance.destroy();
        };
      } catch (err) {
        console.error('Error loading Chart.js:', err);
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      }
    };
    
    loadChart();
  }, []);
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ textAlign: 'center' }}>Population Comparison: US vs Europe</h2>
      
      <div style={{ position: 'relative', height: '400px' }}>
        {isLoading && (
          <div style={{ 
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
            <p>Loading chart...</p>
          </div>
        )}
        
        {error && (
          <div style={{ 
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
            <p style={{ color: 'red' }}>Error: {error}</p>
          </div>
        )}
        
        <canvas ref={chartRef} />
      </div>
      
      <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666', marginTop: '20px' }}>
        Data source: Approximate population figures for 2023 (in millions)
      </p>
    </div>
  );
};

export default SimplifiedChart; 