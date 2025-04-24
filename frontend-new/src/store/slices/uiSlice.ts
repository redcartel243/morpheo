import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { AppRequirements } from '../../components/generator/AppRequirementsForm';
import { generateUIFromRequirements } from '../../services/appGenerationService';
import { collection, addDoc, getDocs, query, where, getFirestore } from 'firebase/firestore';
import { auth } from '../../config/firebase';

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
  currentConfig: UIConfig | null;
  savedConfigs: UIConfig[];
  loading: boolean;
  error: string | null;
  generatingUI: boolean;
}

// Initial state
const initialState: UIState = {
  currentConfig: null,
  savedConfigs: [],
  loading: false,
  error: null,
  generatingUI: false,
};

// Initialize Firestore
const db = getFirestore();

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
      
      if (response.data && response.data.config) {
        return response.data;
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

// Thunk for generating UI from requirements
export const generateAppThunk = createAsyncThunk(
  'ui/generateApp',
  async ({ 
    requirements, 
    useSmartGeneration = false 
  }: { 
    requirements: AppRequirements, 
    useSmartGeneration?: boolean 
  }, { rejectWithValue }) => {
    try {
      console.log('generateAppThunk called with requirements:', requirements);
      console.log('useSmartGeneration flag:', useSmartGeneration);
      
      // Use the service to generate UI from requirements
      const uiConfig = await generateUIFromRequirements(requirements, useSmartGeneration);
      return uiConfig;
    } catch (error: any) {
      console.error('Error in generateAppThunk:', error);
      return rejectWithValue(error.message || 'Failed to generate UI');
    }
  }
);

// Add loadManualConfig Thunk
export const loadManualConfig = createAsyncThunk(
  'ui/loadManualConfig',
  async (config: UIConfig, { rejectWithValue }) => {
    try {
      console.log('Dispatching loadManualConfig with config:', config);

      // Simplified Auth: Assume we need a token
      const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
      const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
      let accessToken = null;
      let headers = {};

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
        console.log('Auth token obtained for loadManualConfig');
      } catch (tokenError: any) {
        console.error('Failed to obtain auth token for loadManualConfig:', tokenError);
        return rejectWithValue('Authentication failed: ' + (tokenError.response?.data?.detail || tokenError.message));
      }

      const endpoint = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/load-config-manual`;
      console.log(`Posting to endpoint: ${endpoint}`);

      // Post the raw config object
      const response = await axios.post(
        endpoint,
        { config },
        { headers }
      );

      console.log('Manual load API response received:', response.data);

      if (response.data && response.data.config) {
        return response.data;
      } else {
        throw new Error('Invalid response structure received from manual load endpoint');
      }

    } catch (error: any) {
      console.error('Error loading manual config:', error);
      let errorMessage = 'Failed to load manual configuration';
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = `API Error (${error.response.status}): ${error.response.data?.detail || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      return rejectWithValue(errorMessage);
    }
  }
);

// Create slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentConfig: (state, action: PayloadAction<UIConfig | null>) => {
      console.log('setCurrentConfig reducer called with:', action.payload);
      state.currentConfig = action.payload;
      state.error = null;
    },
    clearCurrentConfig: (state) => {
      console.log('clearCurrentConfig reducer called');
      state.currentConfig = null;
    },
    updateComponent: (state, action: PayloadAction<{ componentId: string; updates: Partial<Component> }>) => {
      if (!state.currentConfig || !state.currentConfig.components) return;
      
      const { componentId, updates } = action.payload;
      console.log(`updateComponent reducer called for component ${componentId}`);
      
      const updateComponentRecursive = (components: Component[]): boolean => {
        if (!Array.isArray(components)) return false;
        for (let i = 0; i < components.length; i++) {
          if (typeof components[i] !== 'object' || components[i] === null) continue;

          if (components[i].id === componentId) {
            components[i] = { ...components[i], ...updates, id: components[i].id, type: components[i].type };
            return true;
          }
          
          if (Array.isArray(components[i].children) && components[i].children.length > 0) {
            if (updateComponentRecursive(components[i].children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      updateComponentRecursive(state.currentConfig.components || []);
    },
    addComponent: (state, action: PayloadAction<{ parentId: string | null; component: Component }>) => {
      if (!state.currentConfig) return;
      
      if (!Array.isArray(state.currentConfig.components)) {
        state.currentConfig.components = [];
      }

      const { parentId, component } = action.payload;
      
      if (!parentId) {
        state.currentConfig.components.push(component);
        return;
      }
      
      const addComponentRecursive = (components: Component[]): boolean => {
        if (!Array.isArray(components)) return false;
        for (let i = 0; i < components.length; i++) {
          if (typeof components[i] !== 'object' || components[i] === null) continue;

          if (components[i].id === parentId) {
            if (!Array.isArray(components[i].children)) {
              components[i].children = [];
            }
            components[i].children.push(component);
            return true;
          }
          
          if (Array.isArray(components[i].children) && components[i].children.length > 0) {
            if (addComponentRecursive(components[i].children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      addComponentRecursive(state.currentConfig.components);
    },
    removeComponent: (state, action: PayloadAction<string>) => {
      if (!state.currentConfig || !state.currentConfig.components) return;
      
      const componentId = action.payload;
      
      const removeComponentRecursive = (components: Component[]): boolean => {
        if (!Array.isArray(components)) return false;
        for (let i = 0; i < components.length; i++) {
          if (typeof components[i] !== 'object' || components[i] === null) continue;

          if (components[i].id === componentId) {
            components.splice(i, 1);
            return true;
          }
          
          if (Array.isArray(components[i].children) && components[i].children.length > 0) {
            if (removeComponentRecursive(components[i].children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      removeComponentRecursive(state.currentConfig.components || []);
    },
    updateLayout: (state, action: PayloadAction<Partial<Layout>>) => {
      if (!state.currentConfig) return;
      // Ensure layout object exists before spreading
      if (!state.currentConfig.layout) {
        // Initialize with an empty object matching the optional structure
        state.currentConfig.layout = {}; 
      }
      state.currentConfig.layout = { ...state.currentConfig.layout, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate UI
      .addCase(generateUI.pending, (state) => {
        state.generatingUI = true;
        state.loading = true;
        state.error = null;
        state.currentConfig = null;
      })
      .addCase(generateUI.fulfilled, (state, action) => {
        state.generatingUI = false;
        state.loading = false;
        state.currentConfig = action.payload.config;
        console.log('generateUI fulfilled, set currentConfig:', state.currentConfig);
      })
      .addCase(generateUI.rejected, (state, action) => {
        state.generatingUI = false;
        state.loading = false;
        state.error = action.payload as string;
        state.currentConfig = null;
      })
      
      // Load Manual Config
      .addCase(loadManualConfig.pending, (state) => {
        state.loading = true;
        state.generatingUI = false;
        state.error = null;
        state.currentConfig = null;
      })
      .addCase(loadManualConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConfig = action.payload.config;
        console.log('loadManualConfig fulfilled, set currentConfig:', state.currentConfig);
      })
      .addCase(loadManualConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.currentConfig = null;
      })
      
      // Fetch saved configs
      .addCase(fetchSavedConfigs.pending, (state) => {
        console.log('fetchSavedConfigs.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedConfigs.fulfilled, (state, action) => {
        console.log('fetchSavedConfigs.fulfilled with payload:', action.payload);
        state.loading = false;
        state.savedConfigs = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchSavedConfigs.rejected, (state, action) => {
        console.log('fetchSavedConfigs.rejected with error:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Save UI config
      .addCase(saveUIConfig.pending, (state) => {
        console.log('saveUIConfig.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(saveUIConfig.fulfilled, (state, action) => {
        console.log('saveUIConfig.fulfilled with payload:', action.payload);
        state.loading = false;
        if (state.currentConfig) {
          state.currentConfig.id = action.payload.id;
        }
        const index = state.savedConfigs.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.savedConfigs[index] = action.payload;
        } else {
          state.savedConfigs.push(action.payload);
        }
      })
      .addCase(saveUIConfig.rejected, (state, action) => {
        console.log('saveUIConfig.rejected with error:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentConfig,
  clearCurrentConfig,
  updateComponent,
  addComponent,
  removeComponent,
  updateLayout,
} = uiSlice.actions;

export default uiSlice.reducer; 