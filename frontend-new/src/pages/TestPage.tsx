import React, { useState, useEffect } from 'react';
import AppViewer from '../components/AppViewer';
import testTodoApp from '../test-todoapp.json';
import barcelonaMap from '../barcelona-map.json';

const TestPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentApp, setCurrentApp] = useState<'todo' | 'map'>('todo');

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const toggleApp = () => {
    setCurrentApp(currentApp === 'todo' ? 'map' : 'todo');
  };

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="test-page">
      <div className="app-controls" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{currentApp === 'todo' ? 'Testing Todo App' : 'Barcelona Map'}</h1>
        <button 
          onClick={toggleApp}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Switch to {currentApp === 'todo' ? 'Barcelona Map' : 'Todo App'}
        </button>
      </div>
      <div className="app-container" style={{ 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        overflow: 'hidden',
        minHeight: '600px'
      }}>
        <AppViewer appConfig={currentApp === 'todo' ? testTodoApp : barcelonaMap} />
      </div>
    </div>
  );
};

export default TestPage; 