import axios from 'axios';
import { UIConfig } from '../store/slices/uiSlice';
import { AppRequirements } from '../components/generator/AppRequirementsForm';

// Log configuration
console.log('Initializing OpenAI service');
console.log('REACT_APP_USE_OPENAI is set to:', process.env.REACT_APP_USE_OPENAI);
console.log('REACT_APP_API_URL is set to:', process.env.REACT_APP_API_URL);

/**
 * Generate UI configuration using the backend API
 * @param requirements User requirements for the app
 * @returns Generated UI configuration
 */
export const generateUIWithOpenAI = async (requirements: AppRequirements): Promise<UIConfig> => {
  try {
    console.log('Generating UI with OpenAI using requirements:', requirements);
    
    // Get test credentials from environment variables
    const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
    const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
    
    // First, get a token from the backend
    console.log('Getting backend authentication token...');
    const tokenResponse = await axios.post(
      `${process.env.REACT_APP_API_URL}/token`, 
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
    
    const { access_token } = tokenResponse.data;
    console.log('Got backend authentication token');
    
    // Create a request payload for the backend
    const payload = {
      prompt: `Create a ${requirements.appType ? requirements.appType + ' ' : ''}application with the following requirements:
        Purpose: ${requirements.purpose}
        Features: ${requirements.features}
        Data Structure: ${requirements.dataStructure}
        UI Preferences: ${requirements.uiPreferences}
        
For visual elements that require images:
- Use appropriate CSS styling (colors, gradients, patterns) for most visual effects
- For themed backgrounds (like "emoji background"), use colors that evoke the theme (bright, cheerful colors for emoji)
- Only use image URLs if explicitly provided by the user (e.g., "background-image: url('https://example.com/image.jpg')")
- Never use placeholder paths like 'path/to/image.jpg' or similar non-existent references
- When no image URL is provided, implement visual elements with CSS or unicode characters where possible`,
      style_preferences: {
        theme: requirements.uiPreferences.includes('dark') ? 'dark' : 'light',
        layout: requirements.uiPreferences.includes('responsive') ? 'responsive' : 'standard',
        complexity: requirements.uiPreferences.includes('minimal') ? 'minimal' : 'standard'
      }
    };
    
    console.log('Sending request to backend API:', payload);
    
    // Call backend API with authentication
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/generate-ui`, 
      payload,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );
    
    console.log('Backend API response received:', response.data);
    
    // Extract the UI configuration from the response
    const uiConfig = response.data.config as UIConfig;
    
    console.log('Generated UI config parsed successfully');
    console.log('UI config components count:', uiConfig.components ? uiConfig.components.length : 0);
    
    return uiConfig;
  } catch (error: any) {
    console.error('Error generating UI with backend API:', error);
    throw new Error(`Failed to generate UI: ${error.message}`);
  }
};

/**
 * Generate UI configuration using the Smart Generation backend API
 * @param requirements User requirements for the app
 * @returns Generated UI configuration and generation information
 */
export const generateUIWithSmartGeneration = async (requirements: AppRequirements): Promise<{ config: UIConfig; generationInfo: any }> => {
  try {
    console.log('Generating UI with Smart Generation backend API');
    
    // Get test credentials from environment variables
    const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
    const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
    
    // First, get a token from the backend
    console.log('Getting backend authentication token...');
    const tokenResponse = await axios.post(
      `${process.env.REACT_APP_API_URL}/token`, 
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
    
    const { access_token } = tokenResponse.data;
    console.log('Got backend authentication token');
    
    // Convert requirements to the format expected by the backend
    const payload = {
      prompt: `Create a${requirements.appType ? ' ' + requirements.appType : ''} application for: ${requirements.purpose}${requirements.features ? ' with features: ' + requirements.features : ''}
      
For visual elements that require images:
- Use appropriate CSS styling (colors, gradients, patterns) for most visual effects
- For themed backgrounds (like "emoji background"), use colors that evoke the theme (bright, cheerful colors for emoji)
- Only use image URLs if explicitly provided by the user (e.g., "background-image: url('https://example.com/image.jpg')")
- Never use placeholder paths like 'path/to/image.jpg' or similar non-existent references
- When no image URL is provided, implement visual elements with CSS or unicode characters where possible`,
      style_preferences: {
        theme: requirements.uiPreferences.includes('dark') ? 'dark' : 'light',
        layout: requirements.uiPreferences.includes('responsive') ? 'responsive' : 'standard',
        complexity: requirements.uiPreferences.includes('minimal') ? 'minimal' : 'standard'
      }
    };
    
    console.log('Sending request to Smart Generation backend API:', payload);
    
    // Call backend API with authentication
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/generate-component-ui`, 
      payload,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );
    
    console.log('Smart Generation backend API response received:', response.data);
    
    // Extract the UI configuration and generation info from the response
    const uiConfig = response.data.config as UIConfig;
    const generationInfo = response.data.generationInfo || {};
    
    console.log('Extracted UI configuration:', uiConfig);
    console.log('Extracted generation info:', generationInfo);
    
    return { config: uiConfig, generationInfo };
  } catch (error) {
    console.error('Error in generateUIWithSmartGeneration:', error);
    throw error;
  }
} 