import { UIConfig } from '../store/slices/uiSlice';
import { AppRequirements } from '../components/generator/AppRequirementsForm';
import axios from 'axios';

/**
 * Generate a UI configuration based on user requirements
 * This is the main entry point for app generation
 */
export const generateUIFromRequirements = async (
  requirements: AppRequirements,
  useSmartGeneration: boolean = false
): Promise<UIConfig> => {
  try {
    console.log('Starting app generation from requirements:', JSON.stringify(requirements, null, 2));
    console.log('useSmartGeneration flag:', useSmartGeneration);
    
    // Determine if we should use OpenAI or Smart Generation
    // --- ALWAYS use the Morpheo component generation endpoint --- 
    console.log('Calling Morpheo backend endpoint /generate-component-ui');
    
    // Prepare payload for our backend
    const payload = {
      prompt: requirements.purpose // Use the main purpose/prompt text
      // Add other fields from requirements if needed by the backend later
    };

    // --- Add Authentication Flow --- 
    const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
    const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
    let accessToken = null;

    try {
        console.log('Attempting to get auth token from /token endpoint...');
        const tokenResponse = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/token`,
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
        accessToken = tokenResponse.data.access_token;
        console.log('Successfully obtained auth token.');
    } catch (tokenError: any) {
        console.error('Failed to obtain auth token:', tokenError);
        throw new Error('Authentication failed: ' + (tokenError.response?.data?.detail || tokenError.message));
    }

    if (!accessToken) {
        throw new Error('Could not retrieve access token for API call.');
    }
    // --- End Authentication Flow ---

    // API URL
    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/generate-component-ui`;

    // Send request to our backend API with Authorization header
    const response = await axios.post(apiUrl, payload, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    console.log('Backend API response received:', response.data);
    
    // The backend returns { id: ..., config: ... }, we need the config part
    if (response.data && response.data.config) {
        return response.data.config;
    } else {
        throw new Error('Invalid response structure received from backend');
    }
    // --- END Morpheo endpoint call --- 
  } catch (error) {
    console.error('Error in generateUIFromRequirements:', error);
    throw error;
  }
}; 