import React, { useEffect, useState } from 'react';
import {
  createApplicationFromDescription,
  componentRegistry,
  morpheoAI,
  AIProvider
} from '../components/ui/intelligent';

/**
 * Example Growing Button App using the Morpheo Intelligent Component System
 * 
 * This example demonstrates how the AI can create an interactive button that
 * grows and shrinks when clicked, without any application-specific hardcoding.
 * The entire component structure, connections, and behaviors are determined by
 * the AI based on the natural language request.
 */
const GrowingButton: React.FC = () => {
  const [componentIds, setComponentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configure MorpheoAI
    morpheoAI.configure(AIProvider.MORPHEO);

    // Create the growing button app
    async function createGrowingButton() {
      try {
        setIsLoading(true);

        // Describe the application we want to create
        const request = "Create an app with a single button that grows or shrinks when clicked";

        // Use the AI to create the application
        const componentIds = await createApplicationFromDescription(request);

        setComponentIds(componentIds);
        setError(null);
      } catch (err) {
        console.error('Error creating growing button app:', err);
        setError('Failed to create growing button application');
      } finally {
        setIsLoading(false);
      }
    }

    createGrowingButton();
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
    return <div>Loading growing button application...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="growing-button-container">
      <h2>Growing Button Example</h2>
      <div className="growing-button-demo">
        {renderComponents()}
      </div>
    </div>
  );
};

export default GrowingButton; 