import React, { useEffect, useState } from 'react';
import { 
  createApplicationFromDescription, 
  componentRegistry,
  morpheoAI,
  AIProvider
} from '../components/ui/intelligent';

/**
 * Example Calculator App using the Morpheo Intelligent Component System
 * 
 * This example demonstrates how to use natural language to describe
 * an application to the AI, which then creates all the necessary components,
 * connections, and behaviors without any application-specific hardcoding.
 */
const Calculator: React.FC = () => {
  const [componentIds, setComponentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Configure MorpheoAI (in a real app, this would be done at app initialization)
    morpheoAI.configure(AIProvider.MORPHEO);
    
    // Create the calculator app
    async function createCalculator() {
      try {
        setIsLoading(true);
        
        // For a Hello World calculator, we'd specify that in the request
        const request = "Create a calculator where every button displays 'Hello World' on the display";
        
        // Use the AI to create the application
        const componentIds = await createApplicationFromDescription(request);
        
        setComponentIds(componentIds);
        setError(null);
      } catch (err) {
        console.error('Error creating calculator:', err);
        setError('Failed to create calculator application');
      } finally {
        setIsLoading(false);
      }
    }
    
    createCalculator();
  }, []);
  
  // Render the components
  const renderComponents = () => {
    return componentIds.map(id => {
      const instance = componentRegistry.getInstance(id);
      if (!instance) return null;
      
      const definition = componentRegistry.getComponent(instance.type);
      if (!definition) return null;
      
      // Use the component's renderer
      return (
        <div key={id} className="component-wrapper">
          {definition.renderer(instance)}
        </div>
      );
    });
  };
  
  if (isLoading) {
    return <div>Loading calculator...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div className="calculator-container">
      <h2>Intelligent Calculator</h2>
      <div className="calculator-grid">
        {renderComponents()}
      </div>
    </div>
  );
};

export default Calculator; 