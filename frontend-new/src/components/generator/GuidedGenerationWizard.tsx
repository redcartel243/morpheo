import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppRequirements } from './AppRequirementsForm';
import { generateAppThunk } from '../../store/slices/uiSlice';
import Card from '../ui/components/layout/Card';
import Grid from '../ui/components/layout/Grid';
import Text from '../ui/components/basic/Text';

// Guided generation wizard component
export const GuidedGenerationWizard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // State for requirements form
  const [useSmartGeneration, setUseSmartGeneration] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState(0);
  const [requirements, setRequirements] = useState<AppRequirements>({
    appType: '',
    purpose: '',
    features: '',
    dataStructure: '',
    uiPreferences: '',
  });
  
  // Handle next step
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  // Handle back step
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // Handle requirements form submission
  const handleRequirementsSubmit = async () => {
    try {
      console.log('Requirements for generation:', requirements);
      console.log('Using Smart Generation:', useSmartGeneration);
      
      // Generate app using the appropriate method
      console.log('Dispatching generateAppThunk');
      const result = await dispatch(generateAppThunk({
        requirements,
        useSmartGeneration: useSmartGeneration
      }) as any);
      
      if (result.error) {
        console.error('Error generating app:', result.error);
        // Show error message
      } else {
        // Navigate to preview
        navigate('/preview');
      }
    } catch (error) {
      console.error('Error in app generation:', error);
    }
  };
  
  // Render app requirements form
  const renderAppRequirementsStep = () => (
    <div>
      <Text variant="h5" className="mb-4">Describe Your Application</Text>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            What would you like to build?
          </label>
          <input
            type="text"
            value={requirements.appType}
            onChange={(e) => setRequirements({...requirements, appType: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Example: Calculator, Task Tracker, Dashboard, etc."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Purpose
          </label>
          <textarea
            value={requirements.purpose}
            onChange={(e) => setRequirements({...requirements, purpose: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="What is the main purpose of this application?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Features
          </label>
          <textarea
            value={requirements.features}
            onChange={(e) => setRequirements({...requirements, features: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="What features should the application have?"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            UI Preferences
          </label>
          <textarea
            value={requirements.uiPreferences}
            onChange={(e) => setRequirements({...requirements, uiPreferences: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Any specific UI preferences? (colors, layout, style, etc.)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            For visual elements, you can:
            • Use color descriptions (e.g., "bright colorful theme", "gradient background in blue shades") 
            • Include specific image URLs for backgrounds (e.g., "background image: https://example.com/image.jpg")
            • Specify UI styles (e.g., "rounded corners", "minimalist design")
          </p>
        </div>
        
        <div className="flex items-center mt-6">
          <input
            id="useSmartGeneration"
            type="checkbox"
            checked={useSmartGeneration}
            onChange={(e) => setUseSmartGeneration(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="useSmartGeneration" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Use Smart Generation (recommended for complex UIs)
          </label>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleRequirementsSubmit}
          disabled={!requirements.appType || !requirements.purpose}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate
        </button>
      </div>
    </div>
  );
  
  return (
    <Card className="max-w-3xl mx-auto p-6">
      <Text variant="h4" className="mb-6">Create Your Application</Text>
      {renderAppRequirementsStep()}
    </Card>
  );
}; 