import React, { useState, useEffect } from 'react';
import AppViewer from '../components/AppViewer';
import testTodoApp from '../test-todoapp.json';

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
      <h1>Testing Todo App</h1>
      <div className="app-container">
        <AppViewer appConfig={testTodoApp} />
      </div>
    </div>
  );
};

export default TestPage; 