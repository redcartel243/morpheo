import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveUIConfig } from '../../store/slices/uiSlice';
import { RootState } from '../../store';
import DynamicComponent from '../ui/DynamicComponent';
import AppViewer from '../AppViewer';

// Helper to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const UIPreview: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const query = useQuery();
  const configId = query.get('id');
  
  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const { currentConfig, savedConfigs, loading } = useSelector((state: RootState) => state.ui);
  
  // Load the correct configuration based on the query param
  useEffect(() => {
    if (configId) {
      // Find the saved config with this ID
      const savedConfig = savedConfigs.find(config => config.id === configId);
      if (savedConfig) {
        setActiveConfig(savedConfig);
      } else if (!loading) {
        // If we couldn't find it and we're not loading, redirect to dashboard
        navigate('/');
      }
    } else if (currentConfig) {
      // Use the current config from the generator
      setActiveConfig(currentConfig);
    } else if (!loading) {
      // If no config ID and no current config, redirect to generator
      navigate('/generate');
    }
  }, [configId, currentConfig, savedConfigs, loading, navigate]);
  
  // Ensure the active config has all required properties
  useEffect(() => {
    if (activeConfig) {
      // Check if the active config has all required properties
      const safeConfig = {
        ...activeConfig,
        components: Array.isArray(activeConfig.components) ? activeConfig.components : [],
        layout: activeConfig.layout || { type: 'flex', config: {} },
        theme: activeConfig.theme || { 
          colors: {}, 
          typography: {}, 
          spacing: {} 
        },
        functionality: activeConfig.functionality || { 
          type: 'default', 
          config: {} 
        }
      };
      
      // Update the active config if it's missing required properties
      if (!Array.isArray(activeConfig.components) || 
          !activeConfig.layout || 
          !activeConfig.theme || 
          !activeConfig.functionality) {
        setActiveConfig(safeConfig);
      }
    }
  }, [activeConfig]);
  
  const handleSave = async () => {
    if (!activeConfig) return;
    
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      await dispatch(saveUIConfig(activeConfig) as any);
      setSaveSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save UI configuration');
    } finally {
      setSaving(false);
    }
  };
  
  const handleBackToGenerator = () => {
    navigate('/generate');
  };
  
  if (loading || !activeConfig) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-160px)]">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading UI configuration...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            UI Preview
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {configId ? 'Viewing saved UI configuration' : 'Preview of your generated UI'}
          </p>
        </div>
        
        <div className="flex mt-4 md:mt-0 space-x-4">
          {!configId && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                  </svg>
                  Save UI
                </>
              )}
            </button>
          )}
          
          <button
            onClick={handleBackToGenerator}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            {configId ? 'Back to Dashboard' : 'Edit UI'}
          </button>
        </div>
      </div>
      
      {saveSuccess && (
        <div className="mb-8 p-4 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md">
          UI configuration saved successfully!
        </div>
      )}
      
      {saveError && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          {saveError}
        </div>
      )}
      
      {/* UI Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          UI Components
        </h2>
        
        <div className="border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
          {activeConfig ? (
            activeConfig.components && activeConfig.components.length > 0 ? (
              <AppViewer 
                appConfig={activeConfig} 
                height="100%" 
                width="100%" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>No components found in this UI configuration.</p>
                <button 
                  onClick={handleBackToGenerator}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create New UI
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Configuration Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Configuration Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
              Components
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {activeConfig && Array.isArray(activeConfig.components) ? activeConfig.components.length : 0} components
            </p>
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
              Layout
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {activeConfig?.layout?.type || 'default'}
            </p>
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
              Theme
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {activeConfig?.theme?.colors ? Object.keys(activeConfig.theme.colors).length : 0} color variables
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
            JSON Configuration
          </h3>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-60">
            <pre className="text-xs text-gray-800 dark:text-gray-300">
              {JSON.stringify(activeConfig, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIPreview; 