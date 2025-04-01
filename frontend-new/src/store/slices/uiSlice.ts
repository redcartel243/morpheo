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
  styles: Record<string, any>;
  events: Record<string, any>;
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
  components: Component[];
  layout: Layout;
  theme: Theme;
  functionality: Functionality;
  eventHandlers?: Record<string, any>;
  regions?: Record<string, Component[]>;
  state?: Record<string, any>;
  stateReducer?: string;
  dataBindings?: Record<string, string>;
  backend?: {
    services?: Record<string, any>;
    data?: Record<string, any>;
  };
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
      
      if (process.env.REACT_APP_API_KEY) {
        headers = {
          'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}`
        };
      }
      
      // Prepare payload
      const payload = {
        prompt,
        style_preferences: stylePreferences
      };
      
      // Determine which endpoint to use based on useSmartGeneration flag
      const endpoint = useSmartGeneration ? 'generate-component-ui' : 'generate-ui';
      console.log(`Using endpoint: ${process.env.REACT_APP_API_URL}/${endpoint}`);
      
      // Send request to API
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/${endpoint}`,
        payload,
        { headers }
      );
      
      console.log('API response received:', response.data);
      
      if (useSmartGeneration) {
        return {
          config: response.data.config,
          generationInfo: response.data.generationInfo || {}
        };
      } else {
        return {
          config: response.data.config
        };
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

// Create slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCurrentConfig: (state, action: PayloadAction<UIConfig>) => {
      console.log('setCurrentConfig reducer called with:', action.payload);
      state.currentConfig = action.payload;
    },
    clearCurrentConfig: (state) => {
      console.log('clearCurrentConfig reducer called');
      state.currentConfig = null;
    },
    updateComponent: (state, action: PayloadAction<{ componentId: string; updates: Partial<Component> }>) => {
      if (!state.currentConfig) return;
      
      const { componentId, updates } = action.payload;
      console.log(`updateComponent reducer called for component ${componentId}`);
      
      // Helper function to recursively find and update a component
      const updateComponentRecursive = (components: Component[]): boolean => {
        for (let i = 0; i < components.length; i++) {
          if (components[i].id === componentId) {
            components[i] = { ...components[i], ...updates };
            return true;
          }
          
          if (components[i].children.length > 0) {
            if (updateComponentRecursive(components[i].children)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      updateComponentRecursive(state.currentConfig.components);
    },
    addComponent: (state, action: PayloadAction<{ parentId: string | null; component: Component }>) => {
      if (!state.currentConfig) return;
      
      const { parentId, component } = action.payload;
      
      if (!parentId) {
        // Add to root level
        state.currentConfig.components.push(component);
        return;
      }
      
      // Helper function to recursively find parent and add component
      const addComponentRecursive = (components: Component[]): boolean => {
        for (let i = 0; i < components.length; i++) {
          if (components[i].id === parentId) {
            components[i].children.push(component);
            return true;
          }
          
          if (components[i].children.length > 0) {
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
      if (!state.currentConfig) return;
      
      const componentId = action.payload;
      
      // Helper function to recursively find and remove a component
      const removeComponentRecursive = (components: Component[]): boolean => {
        for (let i = 0; i < components.length; i++) {
          if (components[i].id === componentId) {
            components.splice(i, 1);
            return true;
          }
          
          if (components[i].children.length > 0) {
            if (removeComponentRecursive(components[i].children)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      removeComponentRecursive(state.currentConfig.components);
    },
    updateLayout: (state, action: PayloadAction<Partial<Layout>>) => {
      if (!state.currentConfig) return;
      state.currentConfig.layout = { ...state.currentConfig.layout, ...action.payload };
    },
    updateTheme: (state, action: PayloadAction<Partial<Theme>>) => {
      if (!state.currentConfig) return;
      state.currentConfig.theme = { ...state.currentConfig.theme, ...action.payload };
    },
    updateFunctionality: (state, action: PayloadAction<Partial<Functionality>>) => {
      if (!state.currentConfig) return;
      state.currentConfig.functionality = { ...state.currentConfig.functionality, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate UI
      .addCase(generateUI.pending, (state) => {
        state.generatingUI = true;
        state.error = null;
        // Clear the current config when starting a new generation
        state.currentConfig = null;
      })
      .addCase(generateUI.fulfilled, (state, action) => {
        state.generatingUI = false;
        // Set the current config to the newly generated config, completely replacing any previous config
        state.currentConfig = action.payload.config;
      })
      .addCase(generateUI.rejected, (state, action) => {
        state.generatingUI = false;
        state.error = action.payload as string;
      })
      
      // Generate App from Requirements
      .addCase(generateAppFromRequirementsThunk.pending, (state) => {
        console.log('generateAppFromRequirementsThunk.pending');
        state.generatingUI = true;
        state.error = null;
      })
      .addCase(generateAppFromRequirementsThunk.fulfilled, (state, action) => {
        console.log('generateAppFromRequirementsThunk.fulfilled with payload:', action.payload);
        state.generatingUI = false;
        state.currentConfig = action.payload;
      })
      .addCase(generateAppFromRequirementsThunk.rejected, (state, action) => {
        console.log('generateAppFromRequirementsThunk.rejected with error:', action.payload);
        state.generatingUI = false;
        state.error = action.payload as string;
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
        // Ensure savedConfigs is always an array
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
        state.savedConfigs.push(action.payload);
      })
      .addCase(saveUIConfig.rejected, (state, action) => {
        console.log('saveUIConfig.rejected with error:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Generate App
      .addCase(generateAppThunk.pending, (state) => {
        console.log('generateAppThunk.pending');
        state.generatingUI = true;
        state.error = null;
      })
      .addCase(generateAppThunk.fulfilled, (state, action) => {
        console.log('generateAppThunk.fulfilled with payload:', action.payload);
        state.generatingUI = false;
        state.currentConfig = action.payload;
      })
      .addCase(generateAppThunk.rejected, (state, action) => {
        console.log('generateAppThunk.rejected with error:', action.payload);
        state.generatingUI = false;
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
  updateTheme,
  updateFunctionality,
} = uiSlice.actions;

export default uiSlice.reducer; 