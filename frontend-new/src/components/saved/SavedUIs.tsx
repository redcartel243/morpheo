import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchSavedConfigs } from '../../store/slices/uiSlice';
import { RootState } from '../../store';
import axios from 'axios';

const SavedUIs: React.FC = () => {
  const dispatch = useDispatch();
  const { savedConfigs, loading, error } = useSelector((state: RootState) => state.ui);
  
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  useEffect(() => {
    dispatch(fetchSavedConfigs() as any);
  }, [dispatch]);
  
  const handleDelete = async (id: string) => {
    if (!id) return;
    
    setDeleteError(null);
    setDeletingIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    
    try {
      await axios.delete(`/api/ui-configs/${id}`);
      
      // Refresh the list after deletion
      dispatch(fetchSavedConfigs() as any);
    } catch (error: any) {
      setDeleteError(`Failed to delete configuration: ${error.response?.data?.detail || error.message}`);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Saved UIs
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your saved UI configurations
          </p>
        </div>
        
        <Link
          to="/generate"
          className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create New UI
        </Link>
      </div>
      
      {deleteError && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          {deleteError}
        </div>
      )}
      
      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : savedConfigs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedConfigs.map((config) => (
            <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {config.id}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {`UI with ${config.components.length} components, using ${config.layout.type} layout`}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                  <Link
                    to={`/preview?id=${config.id}`}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center"
                  >
                    View
                  </Link>
                  
                  <button
                    onClick={() => handleDelete(config.id || '')}
                    disabled={deletingIds.has(config.id || '')}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingIds.has(config.id || '') ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </div>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You haven't saved any UI configurations yet.
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
  );
};

export default SavedUIs; 