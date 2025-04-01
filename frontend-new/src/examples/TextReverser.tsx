import React, { useEffect, useState } from 'react';
import {
  createApplicationFromDescription,
  componentRegistry,
  morpheoAI,
  AIProvider
} from '../components/ui/intelligent';

/**
 * Example Text Reverser App using the Morpheo Intelligent Component System
 * 
 * This example demonstrates how the AI can create a text manipulation application
 * based on a natural language description, without any application-specific hardcoding.
 * The entire component structure, connections, and transformations are determined
 * by the AI based on the request.
 */
const TextReverser: React.FC = () => {
  const [componentIds, setComponentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configure MorpheoAI
    morpheoAI.configure(AIProvider.MORPHEO);

    // Create the text reverser app
    async function createTextReverser() {
      try {
        setIsLoading(true);

        // Describe the application we want to create
        const request = "Create an app where I type text and it shows the reversed version in real-time";

        // Use the AI to create the application
        const componentIds = await createApplicationFromDescription(request);

        setComponentIds(componentIds);
        setError(null);
      } catch (err) {
        console.error('Error creating text reverser app:', err);
        setError('Failed to create text reverser application');
      } finally {
        setIsLoading(false);
      }
    }

    createTextReverser();
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
    return <div>Loading text reverser application...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="text-reverser-container">
      <h2>Text Reverser Example</h2>
      <p>Type in the input field and see the text reversed below:</p>
      <div className="text-reverser-demo">
        {renderComponents()}
      </div>
    </div>
  );
};

export default TextReverser; 