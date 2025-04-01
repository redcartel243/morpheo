import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get authentication token
export const getAuthToken = async () => {
  try {
    // Use environment variables for test credentials
    const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
    const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
    
    const response = await axios.post(
      `${API_URL}/token`,
      new URLSearchParams({
        'username': testUsername,
        'password': testPassword
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error: any) {
    console.error('Failed to get authentication token:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Authentication failed');
  }
};

// Generate UI with components API
export const generateComponentUI = async (prompt: string, stylePreferences?: Record<string, any>) => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.post(
      `${API_URL}/generate-component-ui`,
      {
        prompt,
        style_preferences: stylePreferences || {
          theme: 'light',
          layout: 'responsive',
          complexity: 'standard'
        },
        use_component_api: true
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Failed to generate component UI:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to generate UI');
  }
};

// Get saved UI configurations
export const getSavedConfigs = async () => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.get(
      `${API_URL}/ui-configs`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Failed to get saved configurations:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch configurations');
  }
};

// Get a specific UI configuration by ID
export const getConfigById = async (id: string) => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.get(
      `${API_URL}/ui-configs/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error(`Failed to get configuration with ID ${id}:`, error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to fetch configuration');
  }
};

// Save a UI configuration
export const saveConfig = async (config: any) => {
  try {
    const token = await getAuthToken();
    
    const response = await axios.post(
      `${API_URL}/ui-configs`,
      { config },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Failed to save configuration:', error);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to save configuration');
  }
}; 