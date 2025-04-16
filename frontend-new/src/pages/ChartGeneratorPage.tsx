import React from 'react';
import ChartGenerator from '../components/ui/charts/ChartGenerator';
import { Link } from 'react-router-dom';

const ChartGeneratorPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">AI-Powered Chart Generator</h1>
        <Link 
          to="/" 
          className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300 transition-colors"
        >
          Back to Home
        </Link>
      </div>
      
      <div className="mb-6 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-800 mb-3">How It Works</h2>
        <p className="text-gray-700 mb-3">
          This demonstration uses the Gemini API with structured output to generate chart configurations
          based on your description. Instead of creating domain-specific chart components (like a BitcoinChart),
          it uses AI to configure our generic AdvancedChart component for any visualization need.
        </p>
        <p className="text-gray-700">
          Try describing different types of data (cryptocurrency prices, weather data, stock performance, etc.)
          and the AI will generate an appropriate chart configuration without any domain-specific hardcoding.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <ChartGenerator />
        </div>
      </div>
      
      <div className="mt-10 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">How This Aligns with Morpheo Principles</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            <strong>No Domain-Specific Components:</strong> We maintain a single generic AdvancedChart component
            rather than creating specialized components for each use case.
          </li>
          <li>
            <strong>AI-Driven Configuration:</strong> The AI handles the domain-specific decisions about
            chart type, colors, and data mapping.
          </li>
          <li>
            <strong>Structured Output:</strong> Using Gemini's structured output ensures we get well-formed
            configurations that match our component's interface.
          </li>
          <li>
            <strong>Flexibility:</strong> This approach works for any data visualization need without
            requiring code changes or new components.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ChartGeneratorPage; 