import React, { useState } from 'react';

export interface AppRequirements {
  purpose: string;
  features: string;
  dataStructure: string;
  uiPreferences: string;
  appType: string;
  preferredComponents?: string[];
}

interface AppRequirementsFormProps {
  initialValues?: Partial<AppRequirements>;
  onSubmit: (requirements: AppRequirements) => void;
}

const AppRequirementsForm: React.FC<AppRequirementsFormProps> = ({ 
  initialValues = {}, 
  onSubmit 
}) => {
  const [requirements, setRequirements] = useState<AppRequirements>({
    purpose: initialValues.purpose || '',
    features: initialValues.features || '',
    dataStructure: initialValues.dataStructure || '',
    uiPreferences: initialValues.uiPreferences || '',
    appType: initialValues.appType || '',
    preferredComponents: initialValues.preferredComponents || [],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleChange = (field: keyof AppRequirements, value: string | string[]) => {
    setRequirements({
      ...requirements,
      [field]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(requirements);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                index + 1 === currentStep 
                  ? 'bg-blue-600 text-white' 
                  : index + 1 < currentStep 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1 < currentStep ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className="text-xs mt-2 text-gray-600">
              {index === 0 && 'Purpose'}
              {index === 1 && 'Features'}
              {index === 2 && 'Data'}
              {index === 3 && 'UI'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Define Your App Requirements
      </h2>
      
      {renderStepIndicator()}
      
      <form onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <div className="mb-6 transition-opacity duration-300">
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
              What do you need this app to help you accomplish?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Describe the main purpose of your app and what problem it solves for you.
            </p>
            <textarea
              value={requirements.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Example: I need to track my daily expenses and categorize them to better manage my budget."
              required
            />
            
            <div className="mt-4">
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                What type of UI components would you like?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(['input', 'button', 'display', 'container', 'data', 'layout'] as const).map((type) => (
                  <div 
                    key={type}
                    onClick={() => handleChange('preferredComponents', 
                      requirements.preferredComponents?.includes(type)
                        ? requirements.preferredComponents.filter(t => t !== type)
                        : [...(requirements.preferredComponents || []), type]
                    )}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      requirements.preferredComponents?.includes(type) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' 
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-medium capitalize">
                        {type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {currentStep === 2 && (
          <div className="mb-6 transition-opacity duration-300">
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
              What specific features do you need?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              List the key features and functionality your app should have.
            </p>
            <textarea
              value={requirements.features}
              onChange={(e) => handleChange('features', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Example: Add expenses, categorize them, see monthly totals, filter by date range, export data to CSV."
              required
            />
          </div>
        )}
        
        {currentStep === 3 && (
          <div className="mb-6 transition-opacity duration-300">
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
              What data will your app need to manage?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Describe the types of data your app will work with and how it should be structured.
            </p>
            <textarea
              value={requirements.dataStructure}
              onChange={(e) => handleChange('dataStructure', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Example: Expense entries with amount, date, category, and optional notes. Categories should include predefined options like 'Food', 'Transport', etc."
              required
            />
          </div>
        )}
        
        {currentStep === 4 && (
          <div className="mb-6 transition-opacity duration-300">
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
              Any specific UI preferences?
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Describe how you want your app to look and feel.
            </p>
            <textarea
              value={requirements.uiPreferences}
              onChange={(e) => handleChange('uiPreferences', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Example: Dark mode, mobile-friendly, minimal design with a focus on data visualization. I prefer a dashboard layout with cards for different sections."
              required
            />
          </div>
        )}
        
        <div className="flex justify-between mt-8">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Previous
            </button>
          )}
          
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Generate App
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AppRequirementsForm; 