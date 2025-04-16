import React, { useState, useEffect } from 'react';
import AppViewer from '../components/AppViewer';
import barcelonaMap from '../barcelona-map.json';

const TestPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="test-page">
      <div className="app-controls" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Barcelona Map Example</h1>
      </div>
      <div className="app-container" style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        overflow: 'hidden',
        minHeight: '600px'
      }}>
        <AppViewer appConfig={barcelonaMap} />
      </div>
    </div>
  );
};

export default TestPage; 