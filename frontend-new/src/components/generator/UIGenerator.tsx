import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppState } from '../../store/store';
import { generateUI, setComponentCode } from '../../store/slices/uiSlice';
import Card from '../ui/components/layout/Card';
import Grid from '../ui/components/layout/Grid';
import Text from '../ui/components/basic/Text';

// Simple UI generator UI
export const UIGenerator: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [promptText, setPromptText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generatingUI = useSelector(
    (state: AppState) => state.ui.generatingUI
  );
  const loading = useSelector((state: AppState) => state.ui.loading);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!promptText.trim()) {
      setError('Please enter a description of the UI you want to create');
      return;
    }
    
    setError(null);
    
    try {
      console.log('Dispatching generateUI thunk');
      const result = await dispatch(generateUI({ prompt: promptText }) as any);
      
      if (result.error) {
        console.error('Error generating UI:', result.error);
        setError(result.error.message || 'Failed to generate UI');
      } else {
        console.log('generateUI successful, navigating to preview...');
        navigate('/preview');
      }
    } catch (err) {
      console.error('Failed to generate UI dispatch:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating the UI');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        setError('Failed to read file content as text.');
        return;
      }

      try {
        console.log('Read code from file:', content.substring(0, 100) + '...');

        dispatch(setComponentCode(content));

        console.log('Raw code loaded successfully, navigating to preview...');
          navigate('/preview');
      } catch (dispatchError: any) {
        console.error('Error setting component code or navigating:', dispatchError);
        setError(dispatchError.message || 'An error occurred loading the code.');
      }
    };

    reader.onerror = () => {
      setError('Error reading file.');
    };

    reader.readAsText(file);

    event.target.value = ''; 
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <input 
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Grid container spacing={4}>
        <Grid item xs={12} lg={10} xl={8} style={{ margin: '0 auto' }}>
          <Card>
            <Text variant="h2" className="mb-6">
              Generate a UI
            </Text>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Describe the UI you want to create:
                </label>
                <textarea
                  id="prompt"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="e.g., A dashboard for tracking daily expenses with a form to add new expenses and a chart to visualize spending trends"
                />
              </div>
              
              <div className="mb-6">
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <strong>Pro tip:</strong> For visual elements like backgrounds, you can either:
                  <br />• Specify colors or CSS effects (e.g., "calculator with a colorful gradient background")
                  <br />• Provide a direct image URL if you want an image background (e.g., "with background image https://example.com/image.jpg")
                </p>
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  type="submit"
                  disabled={generatingUI || !promptText.trim()}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generatingUI ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </div>
                  ) : (
                    'Generate UI'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleImportClick}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading...' : 'Import JSON'}
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate('/guided')}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Use Guided Mode
                </button>
              </div>
            </form>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}; 