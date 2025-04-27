import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { AppRequirements } from '../../components/generator/AppRequirementsForm';
import { generateUIFromRequirements } from '../../services/appGenerationService';

// Define types
export interface Component {
  type: string;
  id: string;
  props: Record<string, any>;
  children: Component[];
  methods?: Record<string, any>;
}

export interface Layout {
  type: string;
  config: Record<string, any>;
}

export interface Theme {
  colors: Record<string, string>;
  typography: Record<string, any>;
  spacing: Record<string, any>;
}

export interface Functionality {
  type: string;
  config: Record<string, any>;
}

export interface UIConfig {
  id?: string;
  name?: string;
  userId?: string;
  createdAt?: number;
  app?: {
    name?: string;
    description?: string;
    theme?: string;
  };
  layout?: {
    type?: string;
    regions?: string[];
  };
  components?: Component[];
}

export interface UIState {
  componentCode: string | null;
  savedConfigs: UIConfig[];
  loading: boolean;
  error: string | null;
  generatingUI: boolean;
}

// Initial state
const initialState: UIState = {
  componentCode: null,
  savedConfigs: [],
  loading: false,
  error: null,
  generatingUI: false,
};

// Async thunks
export const generateUI = createAsyncThunk(
  'ui/generateUI',
  async ({ 
    prompt, 
    useSmartGeneration = false,
    stylePreferences = {}
  }: { 
    prompt: string, 
    useSmartGeneration?: boolean, 
    stylePreferences?: Record<string, any> 
  }, { rejectWithValue }) => {
    try {
      console.log('Generating UI from prompt:', prompt);
      console.log('Using Smart Generation:', useSmartGeneration);
      
      // Add authorization headers
      let headers = {};
      
      const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
      const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
      let accessToken = null;

      try {
        const tokenResponse = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/token`,
          new URLSearchParams({
            'username': testUsername,
            'password': testPassword
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        accessToken = tokenResponse.data.access_token;
        headers = { 'Authorization': `Bearer ${accessToken}` };
        console.log('Auth token obtained for generateUI');
      } catch (tokenError: any) {
        console.error('Failed to obtain auth token for generateUI:', tokenError);
        return rejectWithValue('Authentication failed: ' + (tokenError.response?.data?.detail || tokenError.message));
      }
      
      // Prepare payload
      const payload = {
        prompt,
        style_preferences: stylePreferences
      };
      
      // Always use the component generation endpoint now
      const endpoint = 'generate-component-ui'; 
      console.log(`Using endpoint: ${process.env.REACT_APP_API_URL}/${endpoint}`);
      
      // Send request to API
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/${endpoint}`,
        payload,
        { headers }
      );
      
      console.log('API response received:', response.data);
      
      if (response.data && response.data.error) {
        console.error('Backend returned an error:', response.data.error);
        throw new Error(response.data.error);
      }
      if (response.data && response.data.component_code) {
        return response.data.component_code;
      } else {
        throw new Error('Invalid response structure received from backend');
      }
    } catch (error: any) {
      console.error('Error generating UI:', error);
      return rejectWithValue(error.message || 'Failed to generate UI');
    }
  }
);

export const generateAppFromRequirementsThunk = createAsyncThunk(
  'ui/generateAppFromRequirements',
  async (requirements: AppRequirements, { rejectWithValue }) => {
    try {
      console.log('generateAppFromRequirementsThunk called with requirements:', requirements);
      const uiConfig = await generateUIFromRequirements(requirements);
      console.log('Generated UI config:', uiConfig);
      return uiConfig;
    } catch (error: any) {
      console.error('Error in generateAppFromRequirementsThunk:', error);
      return rejectWithValue(error.message || 'Failed to generate app');
    }
  }
);

export const fetchSavedConfigs = createAsyncThunk(
  'ui/fetchSavedConfigs',
  async (_, { rejectWithValue }) => {
    try {
      console.log('fetchSavedConfigs thunk called');
      
      // Get test credentials from environment variables
      const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
      const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
      
      // First, get a token from the backend
      console.log('Getting backend authentication token...');
      try {
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
        
        // Get user's saved configurations from backend
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/ui-configs`,
            {
              headers: {
                'Authorization': `Bearer ${access_token}`
              }
            }
          );
          
          const configs = response.data;
          console.log('Fetched saved configs:', configs);
          return configs;
        } catch (apiError: any) {
          console.error('Error fetching UI configurations:', apiError);
          return rejectWithValue(
            apiError.response?.data?.detail || 
            apiError.message || 
            'Failed to fetch saved configurations'
          );
        }
      } catch (tokenError: any) {
        console.error('Error getting backend authentication token:', tokenError);
        return rejectWithValue(
          'Authentication failed: ' + 
          (tokenError.response?.data?.detail || tokenError.message)
        );
      }
    } catch (error: any) {
      console.error('Error in fetchSavedConfigs thunk:', error);
      return rejectWithValue(error.message || 'Failed to fetch saved configurations');
    }
  }
);

export const saveUIConfig = createAsyncThunk(
  'ui/saveUIConfig',
  async (config: UIConfig, { rejectWithValue }) => {
    try {
      console.log('saveUIConfig thunk called with config:', config);
      
      // Get test credentials from environment variables
      const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
      const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
      
      // First, get a token from the backend
      console.log('Getting backend authentication token...');
      try {
        // Use the test credentials from the backend
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
        
        // Save to backend
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/ui-configs`, 
          config,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }
        );
        
        console.log('Config saved successfully:', response.data);
        
        // Return the saved config with the new ID
        return response.data;
      } catch (tokenError: any) {
        console.error('Error getting backend authentication token:', tokenError);
        throw new Error('Failed to authenticate with backend: ' + 
          (tokenError.response?.data?.detail || tokenError.message));
      }
    } catch (error: any) {
      console.error('Error in saveUIConfig thunk:', error);
      return rejectWithValue(error.message || 'Failed to save UI configuration');
    }
  }
);

// Modify generateAppThunk
export const generateAppThunk = createAsyncThunk<string, // Return type is now string
  { requirements: AppRequirements; useSmartGeneration?: boolean }, // Args type
  { rejectValue: string } // Type for rejectWithValue
>(
  'ui/generateApp',
  async ({ 
    requirements, 
    useSmartGeneration = false 
  }, { rejectWithValue }) => {
    try {
      console.log('generateAppThunk called with requirements:', requirements);
      // Use the updated service which returns a string
      const generatedCode = await generateUIFromRequirements(requirements, useSmartGeneration);
      return generatedCode; // Return the code string directly
    } catch (error: any) {
      console.error('Error in generateAppThunk:', error);
      return rejectWithValue(error.message || 'Failed to generate UI code');
    }
  }
);

// Add loadManualConfig Thunk (keep as is for now, might need removal later)
export const loadManualConfig = createAsyncThunk(
  'ui/loadManualConfig',
  async (config: UIConfig, { rejectWithValue }) => {
    // ... existing implementation ...
    // THIS THUNK IS LIKELY OBSOLETE with the new code generation approach
    // It loads old JSON format. Mark for potential removal.
    console.warn("loadManualConfig is likely obsolete and loads the old config format.");
    // ... rest of existing implementation ...
    // Temporarily return something to satisfy TS, but expect backend to fail or logic to change
    if (config) return { id: 'manual-load-placeholder', config }; 
    throw new Error('Manual load failed or is incompatible');
  }
);

// NEW Thunk for Modification
export const modifyUI = createAsyncThunk(
  'ui/modifyUI',
  async ({ 
    modificationPrompt, 
    currentCode 
  }: { 
    modificationPrompt: string, 
    currentCode: string | null 
  }, { rejectWithValue }) => {
    if (!currentCode) {
      return rejectWithValue('No current code available to modify.');
    }
    try {
      console.log('Modifying UI with prompt:', modificationPrompt);
      console.log('Current code length:', currentCode.length);
      
      // --- Authentication Flow (Copy from generateUI) --- 
      let headers = {};
      const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
      const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
      let accessToken = null;

      try {
        const tokenResponse = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/token`,
          new URLSearchParams({
            'username': testUsername,
            'password': testPassword
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        accessToken = tokenResponse.data.access_token;
        headers = { 'Authorization': `Bearer ${accessToken}` };
        console.log('Auth token obtained for modifyUI');
      } catch (tokenError: any) {
        console.error('Failed to obtain auth token for modifyUI:', tokenError);
        return rejectWithValue('Authentication failed: ' + (tokenError.response?.data?.detail || tokenError.message));
      }
      // --- End Authentication Flow --- 
      
      // Prepare payload for the new endpoint
      const payload = {
        prompt: modificationPrompt,
        current_code: currentCode
      };
      
      // Define the NEW endpoint (needs backend implementation)
      const endpoint = 'api/modify-component'; 
      console.log(`Using modification endpoint: ${process.env.REACT_APP_API_URL}/${endpoint}`);
      
      // Send request to the NEW API endpoint
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/${endpoint}`, 
        payload,
        { headers }
      );
      
      console.log('Modification API response received:', response.data);
      
      // Assume response structure similar to generateUI
      if (response.data && response.data.error) {
        console.error('Backend returned an error during modification:', response.data.error);
        throw new Error(response.data.error);
      }
      if (response.data && response.data.component_code) {
        return response.data.component_code; // Return the modified code
      } else {
        throw new Error('Invalid response structure received from modification endpoint');
      }
    } catch (error: any) {
      console.error('Error modifying UI:', error);
      return rejectWithValue(error.message || 'Failed to modify UI');
    }
  }
);

// Create slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setComponentCode: (state, action: PayloadAction<string | null>) => {
      console.log('setComponentCode reducer called with code:', action.payload ? action.payload.substring(0, 50) + '...' : null);
      state.componentCode = action.payload;
      state.error = null; // Clear error on new code
      state.loading = false;
      state.generatingUI = false;
    },
    clearGeneratedCode: (state) => {
      console.log('clearGeneratedCode reducer called');
      state.componentCode = null;
      state.error = null;
    },
    setUiLoading: (state, action: PayloadAction<boolean>) => {
        state.loading = action.payload;
        if(action.payload) state.error = null; // Clear error when starting load
    },
    setUiError: (state, action: PayloadAction<string | null>) => {
        state.error = action.payload;
        state.loading = false;
        state.generatingUI = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle generateUI (The one used by UIGenerator)
      .addCase(generateUI.pending, (state) => {
          console.log('[generateUI.pending]');
          state.generatingUI = true;
          state.loading = true;
          state.error = null;
          state.componentCode = null; // Clear previous code
      })
      .addCase(generateUI.fulfilled, (state, action: PayloadAction<string>) => {
          // Payload here should be the component code string
          console.log('[generateUI.fulfilled] Received component code:', action.payload ? action.payload.substring(0, 50) + '...' : 'null');
          
          // Clean the received code: Remove potential BOM and trim whitespace
          let cleanedCode = action.payload || '';
          cleanedCode = cleanedCode.replace(/^\uFEFF?/, ''); // Remove potential BOM
          cleanedCode = cleanedCode.trim();
          console.log('[generateUI.fulfilled] Cleaned code for storage:', cleanedCode ? cleanedCode.substring(0, 50) + '...' : 'null');

          state.generatingUI = false;
          state.loading = false;
          // Store the code directly as received from backend (should be clean JS now)
          state.componentCode = cleanedCode || null;
          state.error = null;
      })
      .addCase(generateUI.rejected, (state, action) => {
          console.error('[generateUI.rejected] Error:', action.payload || action.error.message);
          state.generatingUI = false;
          state.loading = false;
          state.error = typeof action.payload === 'string' ? action.payload : (action.error.message || 'Unknown error during UI generation');
          state.componentCode = null;
      })
      // Handle generateAppThunk (Keep existing, might be used elsewhere or deprecated)
      .addCase(generateAppThunk.pending, (state) => {
        console.log('[generateAppThunk.pending]');
        state.generatingUI = true;
        state.loading = true;
        state.error = null;
        state.componentCode = null; // Clear previous code
      })
      .addCase(generateAppThunk.fulfilled, (state, action: PayloadAction<string>) => {
        console.log('[generateAppThunk.fulfilled] Received component code:', action.payload.substring(0, 50) + '...');
        state.generatingUI = false;
        state.loading = false;
        state.componentCode = action.payload; // Store the code string
        state.error = null;
      })
      .addCase(generateAppThunk.rejected, (state, action) => {
        console.error('[generateAppThunk.rejected] Error:', action.payload || action.error.message);
        state.generatingUI = false;
        state.loading = false;
        state.error = action.payload || action.error.message || 'Unknown error during UI generation';
        state.componentCode = null;
      })
      // Handle loadManualConfig (Mark as potentially obsolete)
      .addCase(loadManualConfig.pending, (state) => {
        console.log('[loadManualConfig.pending] - OBSOLETE?');
        state.loading = true;
        state.error = null;
        // state.currentConfig = null; // Removed
        state.componentCode = null;
      })
      .addCase(loadManualConfig.fulfilled, (state, action) => {
        console.warn('[loadManualConfig.fulfilled] - OBSOLETE? Loaded old format:', action.payload);
        state.loading = false;
        // state.currentConfig = action.payload.config; // Removed
        // We can't easily display this old config now. Clear code or show error?
        state.componentCode = null; 
        state.error = "Loaded manual configuration (old format) - Cannot display as code.";
      })
      .addCase(loadManualConfig.rejected, (state, action) => {
        console.error('[loadManualConfig.rejected] - OBSOLETE? Error:', action.payload || action.error.message);
        state.loading = false;
        // Ensure error is always a string
        state.error = typeof action.payload === 'string' 
                        ? action.payload 
                        : (action.error?.message || 'Failed to load manual configuration');
      })
      // --- Add cases for modifyUI --- 
      .addCase(modifyUI.pending, (state) => {
        console.log('[modifyUI.pending]');
        state.generatingUI = true; // Reuse generatingUI flag for loading state
        state.loading = true;
        state.error = null;
        // Keep existing code while modifying
      })
      .addCase(modifyUI.fulfilled, (state, action: PayloadAction<string>) => {
        console.log('[modifyUI.fulfilled] Received modified code:', action.payload ? action.payload.substring(0, 50) + '...' : 'null');
        
        let cleanedCode = action.payload || '';
        cleanedCode = cleanedCode.replace(/^\uFEFF?/, ''); // Remove BOM
        cleanedCode = cleanedCode.trim();
        
        state.generatingUI = false;
        state.loading = false;
        state.componentCode = cleanedCode || null; // Update with modified code
        state.error = null;
      })
      .addCase(modifyUI.rejected, (state, action) => {
        console.error('[modifyUI.rejected] Error:', action.payload || action.error.message);
        state.generatingUI = false;
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : (action.error.message || 'Unknown error during UI modification');
        // Keep existing code on modification failure? Or clear? Let's keep it for now.
      });
  },
});

// Export actions and reducer
export const {
  setComponentCode,
  clearGeneratedCode,
  setUiLoading,
  setUiError,
} = uiSlice.actions;

export default uiSlice.reducer; 