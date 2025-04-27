import axios from 'axios';
import { AppRequirements } from '../components/generator/AppRequirementsForm';

// Define the expected response structure from the backend
interface GeneratedCodeResponse {
  component_code: string | null;
  error: string | null;
}

/**
 * Generate React component code based on user requirements
 * Calls the new /api/generate endpoint.
 */
export const generateUIFromRequirements = async (
  requirements: AppRequirements,
  useSmartGeneration: boolean = false // This flag might be irrelevant now
): Promise<string> => { // Changed return type
  try {
    console.log('Starting component code generation from requirements:', JSON.stringify(requirements, null, 2));
    // console.log('useSmartGeneration flag:', useSmartGeneration); // Keep or remove based on relevance
    
    // Prepare payload for our backend - uses "request" key
    const payload = {
      request: requirements.purpose // Use the main purpose/prompt text
    };

    // --- Authentication Flow (Keep as is) --- 
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

    // API URL - Updated to the correct endpoint
    const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/generate`;

    // Send request to our backend API with Authorization header
    const response = await axios.post<GeneratedCodeResponse>(apiUrl, payload, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    console.log('Backend API response received (/api/generate):', response.data);
    
    // --- Updated Response Handling --- 
    if (response.data) {
        if (response.data.error) {
            console.error('Backend returned an error:', response.data.error);
            throw new Error(response.data.error);
        }
        if (response.data.component_code && typeof response.data.component_code === 'string') {
            console.log('Successfully received component code.');
            return response.data.component_code; // Return the code string
        }
    }
    
    // If we reach here, the response structure was unexpected
    throw new Error('Invalid or unexpected response structure received from backend');
    // --- End Updated Response Handling --- 

  } catch (error: any) {
    console.error('Error in generateUIFromRequirements:', error);
    // Re-throw the error so the thunk can catch it
    if (error instanceof Error) {
    throw error;
    } else { 
         // Handle cases where error might not be an Error instance
         throw new Error('An unknown error occurred during UI generation');
    }
  }
}; 