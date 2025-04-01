import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchSavedConfigs, clearCurrentConfig } from '../../store/slices/uiSlice';
import { RootState } from '../../store';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.auth);
  const { savedConfigs, loading, error } = useSelector((state: RootState) => state.ui);
  
  useEffect(() => {
    // Clear any current config when visiting the dashboard
    dispatch(clearCurrentConfig());
    
    // Fetch saved configs with error handling
    const fetchConfigs = async () => {
      try {
        await dispatch(fetchSavedConfigs() as any);
      } catch (err) {
        console.error('Error fetching saved configs:', err);
        setFetchError('Failed to load saved configurations. Please try again later.');
      }
    };
    
    fetchConfigs();
  }, [dispatch]);
  
  // Show error from state if it exists
  useEffect(() => {
    if (error) {
      setFetchError(error);
    }
  }, [error]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.displayName || user?.email || 'User'}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create and manage your AI-generated UIs
          </p>
        </div>
        
        <Link
          to="/generate"
          className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create New UI
        </Link>
      </div>
      
      {/* Display fetch error if it exists */}
      {fetchError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          <p>{fetchError}</p>
          <button 
            onClick={() => dispatch(fetchSavedConfigs() as any)}
            className="mt-2 text-sm font-medium text-red-700 dark:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Generate New UI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Describe what you want, and let AI create a custom UI for you.
            </p>
            <Link
              to="/generate"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Get started →
            </Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Saved UIs
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              View and manage your previously created UI configurations.
            </p>
            <Link
              to="/saved"
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
            >
              View saved UIs →
            </Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Example UIs
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Explore pre-built examples to get inspiration for your own UIs.
            </p>
            <a
              href="#examples"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium"
            >
              View examples →
            </a>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Recent UIs
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : savedConfigs && savedConfigs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedConfigs.slice(0, 3).map((config) => config && (
              <div key={config.id || 'unknown'} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {config.id || 'Untitled UI'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {`UI with ${config.components?.length || 0} components`}
                  </p>
                  <div className="flex justify-end">
                    <Link
                      to={`/preview?id=${config.id || ''}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                      View UI →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven't created any UIs yet.
            </p>
            <Link
              to="/generate"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create your first UI
            </Link>
          </div>
        )}
      </div>
      
      <div id="examples" className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Example UIs
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">Calculator Preview</span>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Calculator
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A calculator with standard operations and a clean modern design.
              </p>
              <div className="flex justify-between">
                <Link
                  to="/app?type=calculator"
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                >
                  View Demo →
                </Link>
                <button
                  onClick={() => {
                    setPrompt("Create a calculator with standard operations and a clean modern design.");
                    navigate('/generate');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Try this example →
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">Finance Dashboard Preview</span>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Finance Dashboard
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A finance dashboard with a pie chart, an income/expense tracker, and weekly summaries.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setPrompt("I need a finance dashboard with a pie chart, an income/expense tracker, and weekly summaries.");
                    navigate('/generate');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Try this example →
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">Todo App Preview</span>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Todo App
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A todo list application with task management and priority levels.
              </p>
              <div className="flex justify-between">
                <Link
                  to="/app"
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                >
                  View Demo →
                </Link>
                <button
                  onClick={() => {
                    setPrompt("Create a todo list app with task management and priority levels.");
                    navigate('/generate');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Try this example →
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">TaskMaster Preview</span>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                TaskMaster
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A comprehensive to-do list application with categorization and priority levels.
              </p>
              <div className="flex justify-between">
                <Link
                  to="/app?type=taskmaster"
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                >
                  View Demo →
                </Link>
                <button
                  onClick={() => {
                    setPrompt("Create a comprehensive to-do list app with categorization and priority levels.");
                    navigate('/generate');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Try this example →
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">Component Library Preview</span>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Component Library
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                A modern UI component library with reusable elements and responsive layouts.
              </p>
              <div className="flex justify-between">
                <Link
                  to="/preview/component-library"
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                >
                  View Demo →
                </Link>
                <button
                  onClick={() => {
                    setPrompt("Create a modern UI component library with reusable elements and responsive layouts.");
                    navigate('/generate');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Try this example →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 