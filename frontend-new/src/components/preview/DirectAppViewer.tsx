import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppViewer from '../AppViewer';
import { getConfigById } from '../../services/api';

// Helper to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

interface AppViewerProps {
  appConfig: any;
  height?: string;
  width?: string;
}

const DirectAppViewer: React.FC = () => {
  const query = useQuery();
  const configId = query.get('id');
  const [appConfig, setAppConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      if (!configId) {
        setError('No configuration ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const config = await getConfigById(configId);
        setAppConfig(config);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load configuration');
        setLoading(false);
      }
    };

    loadConfig();
  }, [configId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!appConfig) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">No Configuration Found!</strong>
          <span className="block sm:inline"> Please provide a valid configuration ID.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{appConfig.name || appConfig.app?.name || 'App Preview'}</h1>
      <div className="border rounded-lg bg-white p-6 min-h-[600px] shadow-lg">
        <AppViewer 
          appConfig={appConfig} 
          height="100%" 
          width="100%" 
        />
      </div>
    </div>
  );
};

export default DirectAppViewer; 