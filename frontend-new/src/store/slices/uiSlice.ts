import { createSlice, createAsyncThunk, PayloadAction, Dispatch } from '@reduxjs/toolkit';
// import api from '../../services/api'; // Assuming your API service setup
import { GenerationDetail, GenerationInfo } from '../../types';
import { auth } from '../../config/firebase'; // Import the auth object from Firebase config
// import { cleanHtmlContent } from '../../utils/cleaning'; // Import the cleaning utility

// --- Interfaces ---

// Backend response type for suggestions
interface SuggestModificationsResponse {
    suggestions: string[];
}

// --- Type for the new thunk argument ---
interface GenerateWithFilesPayload {
  prompt: string;
  files: FileList | null; // Allow null if no files selected
}

interface ModifyWithFilesPayload {
  modificationPrompt: string;
  currentHtml: string;
  files: FileList | null; // Allow null if no files selected
}

export interface UIState {
  generatedHtmlContent: string | null;
  lastPrompt: string | null;
  error: string | null;
  generatingFullCode: boolean;
  modifyingCode: boolean;
  modificationError: string | null;
  streamCompletedSuccessfully: boolean;
  isCorrectingSecurity: boolean;
  isReplacingForCorrection: boolean;
  securityCorrectionError: string | null;
  loadedGenerationHtml: string | null;
  loadedGenerationPrompt: string | null;
  htmlHistory: string[];
  historyIndex: number;
  savedGenerations: GenerationInfo[];
  loadingGenerations: boolean;
  loadingGenerationsError: string | null;
  currentGenerationDetail: GenerationDetail | null;
  loadingGenerationDetail: boolean;
  loadingGenerationDetailError: string | null;
  suggestions: string[];
  loadingSuggestions: boolean;
  suggestionsError: string | null;
  // --- Live update command for preview ---
  liveUpdateCommandForPreview?: {
    targetId: string;
    propertySchema: any;
    newValue: any;
  } | null;
  // --- Types for property extraction ---
  extractedPropertySchema: PropertySchema[];
  extractedPropertyValues: Record<string, any>;
}

const initialState: UIState = {
  generatedHtmlContent: null,
  lastPrompt: null,
  error: null,
  generatingFullCode: false,
  modifyingCode: false,
  modificationError: null,
  streamCompletedSuccessfully: false,
  isCorrectingSecurity: false,
  isReplacingForCorrection: false,
  securityCorrectionError: null,
  loadedGenerationHtml: null,
  loadedGenerationPrompt: null,
  htmlHistory: [],
  historyIndex: -1,
  savedGenerations: [],
  loadingGenerations: false,
  loadingGenerationsError: null,
  currentGenerationDetail: null,
  loadingGenerationDetail: false,
  loadingGenerationDetailError: null,
  suggestions: [],
  loadingSuggestions: false,
  suggestionsError: null,
  // --- Live update command for preview ---
  liveUpdateCommandForPreview: null,
  // --- Types for property extraction ---
  extractedPropertySchema: [],
  extractedPropertyValues: {},
};

// Helper function to get the auth token
const getAuthToken = async (thunkAPI: any) => {
  // Use the imported auth object
  if (!auth.currentUser) {
    return thunkAPI.rejectWithValue('User not authenticated');
  }
  try {
    const token = await auth.currentUser.getIdToken();
    if (!token) {
      return thunkAPI.rejectWithValue('Failed to retrieve Firebase ID token.');
    }
    return token;
  } catch (error: any) {
    console.error('Error getting Firebase ID token:', error);
    return thunkAPI.rejectWithValue(error.message || 'Error retrieving Firebase ID token.');
  }
};

// --- Helper Function for Streaming API Calls ---
const streamApiCall = async (url: string, body: any, thunkAPI: any): Promise<string> => {
    const state = thunkAPI.getState() as { auth: { token: string | null } };
    const token = state.auth.token;

    if (!token) {
      return thunkAPI.rejectWithValue('No authentication token found.');
    }

    // --- Construct full API URL --- 
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Fallback for safety
    const fullUrl = `${apiUrl}${url}`; // Prepend base URL
    console.log(`[streamApiCall] Making request to: ${fullUrl}`); // Log the full URL
    // --- End URL construction ---

    try {
        // --- Use fullUrl --- 
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(errorData.detail || `Request failed with status ${response.status}`);
        }

        // Handle Streaming Response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader.');
        }

        let accumulatedContent = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Check for backend error signals within the stream
          if (chunk.includes("<!-- ERROR:")) {
             const errorMatch = chunk.match(/<!-- ERROR: (.*) -->/);
             const errorMessage = errorMatch ? errorMatch[1] : "Unknown error signaled from backend stream.";
             console.error("Backend stream signaled error:", errorMessage);
             // Dispatch error action BEFORE throwing
             thunkAPI.dispatch(uiSlice.actions.streamError({ message: errorMessage }));
             throw new Error(errorMessage); // Still throw to reject the thunk
          }
          // --- Dispatch chunk --- 
          thunkAPI.dispatch(uiSlice.actions.streamChunkReceived({ chunk }));
          // --- End dispatch chunk --- 
          accumulatedContent += chunk;
        }

        return accumulatedContent; // Return the full content on success

      } catch (error: any) {
        console.error("Streaming API Error:", error);
        return thunkAPI.rejectWithValue(error.message || 'An unknown error occurred during the streaming request.');
      }
};

// --- Async Thunks ---

// Generate Full Code Thunk using the helper
export const generateFullCode = createAsyncThunk<string, string>(
  'ui/generateFullCode',
  async (prompt, thunkAPI) => {
    return streamApiCall('/api/generate-full-code', { prompt }, thunkAPI);
  }
);

// Modify Generated Code Thunk using the helper
export const modifyGeneratedCode = createAsyncThunk<string, { modificationPrompt: string; currentHtml: string }>(
  'ui/modifyGeneratedCode',
  async ({ modificationPrompt, currentHtml }, thunkAPI) => {
    return streamApiCall('/api/modify-full-code', { modification_prompt: modificationPrompt, current_html: currentHtml }, thunkAPI);
  }
);

// --- NEW Thunk for Generating with Files (Non-Streaming FormData) ---
export const generateCodeWithFiles = createAsyncThunk<
  string, // Return type: the accumulated HTML string from the stream
  GenerateWithFilesPayload, // Argument type: { prompt, files }
  { dispatch: Dispatch, rejectValue: string } // Include Dispatch in thunkAPI types
>(
  'ui/generateCodeWithFiles',
  async ({ prompt, files }, thunkAPI) => {
    // console.log('[generateCodeWithFiles] Thunk started (streaming).');
    const token = await getAuthToken(thunkAPI);
    if (typeof token === 'object' && token !== null && 'rejectWithValue' in token) return token;

    const formData = new FormData();
    formData.append('prompt', prompt);
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i], files[i].name);
      }
      // console.log(`[generateCodeWithFiles] Appended ${files.length} files to FormData.`);
    } else {
      // console.log('[generateCodeWithFiles] No files to append.');
    }

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/v2/generate-full-code-with-files`;
    console.log(`[generateCodeWithFiles] Making streaming request to: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // No 'Content-Type' needed for FormData, browser sets it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        let errorDetail = `HTTP error! Status: ${response.status}`;
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || errorDetail;
        } catch (e) {
          try {
            const errorText = await response.text();
            errorDetail = errorText || errorDetail;
          } catch (textErr) { /* Keep original HTTP error */ }
        }
        console.error('[generateCodeWithFiles] Request failed:', errorDetail);
        thunkAPI.dispatch(uiSlice.actions.streamError({ message: errorDetail, isGenerating: true }));
        return thunkAPI.rejectWithValue(errorDetail);
      }

      // Handle Streaming Response
      const reader = response.body?.getReader();
      if (!reader) {
        const errorMsg = 'Failed to get response reader for streaming.';
        thunkAPI.dispatch(uiSlice.actions.streamError({ message: errorMsg, isGenerating: true }));
        throw new Error(errorMsg);
      }

      let accumulatedContent = '';
      const decoder = new TextDecoder();
      // Dispatch streamStart here, as the request is successful and streaming is about to begin
      // Pass the original prompt to streamStart
      thunkAPI.dispatch(uiSlice.actions.streamStart({ isGenerating: true, prompt: prompt }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        if (chunk.includes("<!-- ERROR:")) {
           const errorMatch = chunk.match(/<!-- ERROR: (.*) -->/);
           const errorMessage = errorMatch ? errorMatch[1] : "Unknown error signaled from backend stream.";
           console.error("[generateCodeWithFiles] Backend stream signaled error:", errorMessage);
           thunkAPI.dispatch(uiSlice.actions.streamError({ message: errorMessage, isGenerating: true }));
           throw new Error(errorMessage); 
        }
        thunkAPI.dispatch(uiSlice.actions.streamChunkReceived({ chunk }));
        accumulatedContent += chunk;
      }
      // Do not dispatch streamComplete here, it's handled by the extraReducer's fulfilled case
      // console.log('[generateCodeWithFiles] Streaming successful. Final accumulated HTML (first 500 chars):', accumulatedContent ? accumulatedContent.substring(0, 500) + '...' : 'null_or_empty');
      return accumulatedContent; // Return the full content on success

    } catch (error: any) {
      console.error('[generateCodeWithFiles] Fetch/Streaming error:', error);
      // Ensure streamError is dispatched if not already by a backend signaled error
      if (!error.message.includes("Unknown error signaled from backend stream")) {
          thunkAPI.dispatch(uiSlice.actions.streamError({ message: error.message || 'An unknown network error occurred.', isGenerating: true }));
      }
      return thunkAPI.rejectWithValue(error.message || 'An unknown network error occurred.');
    }
  }
);
// --- End NEW Thunk ---

// --- NEW Thunk for Modifying with Files (Streaming FormData) ---
export const modifyCodeWithFiles = createAsyncThunk<
  string, // Return type: accumulated HTML string
  ModifyWithFilesPayload, // Argument type
  { dispatch: Dispatch, rejectValue: string } // ThunkAPI config
>(
  'ui/modifyCodeWithFiles',
  async ({ modificationPrompt, currentHtml, files }, thunkAPI) => {
    // console.log('[modifyCodeWithFiles] Thunk started (streaming).');
    const token = await getAuthToken(thunkAPI);
    if (typeof token === 'object' && token !== null && 'rejectWithValue' in token) return token;

    const formData = new FormData();
    formData.append('modification_prompt', modificationPrompt);
    formData.append('current_html', currentHtml);
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i], files[i].name);
      }
      // console.log(`[modifyCodeWithFiles] Appended ${files.length} files to FormData.`);
    } else {
      // console.log('[modifyCodeWithFiles] No files to append for modification.');
    }

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/v2/modify-full-code-with-files`; // Use the new v2 endpoint
    console.log(`[modifyCodeWithFiles] Making streaming request to: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorDetail = `HTTP error! Status: ${response.status}`;
        try { const errorJson = await response.json(); errorDetail = errorJson.detail || errorDetail; }
        catch (e) { try { const errorText = await response.text(); errorDetail = errorText || errorDetail; } catch (textErr) { /* Keep original */ } }
        console.error('[modifyCodeWithFiles] Request failed:', errorDetail);
        thunkAPI.dispatch(uiSlice.actions.streamError({ message: errorDetail, isModifying: true }));
        return thunkAPI.rejectWithValue(errorDetail);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const errorMsg = 'Failed to get response reader for modification streaming.';
        thunkAPI.dispatch(uiSlice.actions.streamError({ message: errorMsg, isModifying: true }));
        throw new Error(errorMsg);
      }

      let accumulatedContent = '';
      const decoder = new TextDecoder();
      // Dispatch streamStart for modification
      thunkAPI.dispatch(uiSlice.actions.streamStart({ isModifying: true })); 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        if (chunk.includes("<!-- ERROR:")) {
           const errorMatch = chunk.match(/<!-- ERROR: (.*) -->/);
           const errorMessage = errorMatch ? errorMatch[1] : "Unknown error signaled from backend modification stream.";
           console.error("[modifyCodeWithFiles] Backend stream signaled error:", errorMessage);
           thunkAPI.dispatch(uiSlice.actions.streamError({ message: errorMessage, isModifying: true }));
           throw new Error(errorMessage); 
        }
        thunkAPI.dispatch(uiSlice.actions.streamChunkReceived({ chunk }));
        accumulatedContent += chunk;
      }
      // console.log('[modifyCodeWithFiles] Streaming successful. Final accumulated HTML (first 500 chars):', accumulatedContent ? accumulatedContent.substring(0, 500) + '...' : 'null_or_empty');
      return accumulatedContent;

    } catch (error: any) {
      console.error('[modifyCodeWithFiles] Fetch/Streaming error:', error);
      if (!error.message.includes("Unknown error signaled from backend")) {
          thunkAPI.dispatch(uiSlice.actions.streamError({ message: error.message || 'An unknown network error occurred.', isModifying: true }));
      }
      return thunkAPI.rejectWithValue(error.message || 'An unknown network error occurred.');
    }
  }
);
// --- End NEW Thunk ---

// --- Thunks for Save/Load/Delete --- 
// Thunk to save generation
export const saveGeneration = createAsyncThunk<
  GenerationInfo, 
  { prompt: string; htmlContent: string; name?: string }, 
  { rejectValue: { message: string } } 
>(
  'ui/saveGeneration',
  async (generationData, thunkAPI) => {
    const state = thunkAPI.getState() as { auth: { token: string | null } };
    const token = state.auth.token;
    if (!token) {
      return thunkAPI.rejectWithValue({ message: 'Authentication token not found.' });
    }
    // --- MODIFICATION START: Prepend API URL ---
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/save-generation`;
    try {
      const response = await fetch(fullUrl, {
    // --- MODIFICATION END ---
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(generationData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save generation' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const savedInfo: GenerationInfo = await response.json();
      return savedInfo; 
    } catch (error: any) {
      console.error('Save Generation Error:', error);
      return thunkAPI.rejectWithValue({ message: error.message || 'An unknown error occurred while saving.' });
    }
  }
);

// Thunk to fetch all generations for the user
export const fetchGenerations = createAsyncThunk<
  GenerationInfo[], 
  void, 
  { rejectValue: { message: string } } 
>(
  'ui/fetchGenerations',
  async (_, thunkAPI) => {
    const state = thunkAPI.getState() as { auth: { token: string | null } };
    const token = state.auth.token;
    if (!token) {
      return thunkAPI.rejectWithValue({ message: 'Authentication token not found.' });
    }
    // --- MODIFICATION START: Prepend API URL ---
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/generations`;
    try {
      const response = await fetch(fullUrl, {
    // --- MODIFICATION END ---
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch generations' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const generations: GenerationInfo[] = await response.json();
      return generations.map(gen => ({
         ...gen,
         createdAt: new Date(gen.createdAt) 
        }));
    } catch (error: any) {
      console.error('Fetch Generations Error:', error);
      return thunkAPI.rejectWithValue({ message: error.message || 'An unknown error occurred while fetching generations.' });
    }
  }
);

// Thunk to fetch details of a single generation
export const fetchGenerationDetail = createAsyncThunk<
  GenerationDetail, 
  string, 
  { rejectValue: { message: string } } 
>(
  'ui/fetchGenerationDetail',
  async (generationId, thunkAPI) => {
    const state = thunkAPI.getState() as { auth: { token: string | null } };
    const token = state.auth.token;
    if (!token) {
      return thunkAPI.rejectWithValue({ message: 'Authentication token not found.' });
    }
    // --- MODIFICATION START: Prepend API URL ---
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/generations/${generationId}`;
    try {
      const response = await fetch(fullUrl, {
    // --- MODIFICATION END ---
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch generation details' }));
        if (response.status === 404) {
             throw new Error('Generation not found.');
        } else if (response.status === 403) {
             throw new Error('Not authorized to access this generation.');
        }
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const generationDetail: GenerationDetail = await response.json();
       return {
          ...generationDetail,
          createdAt: new Date(generationDetail.createdAt)
       };
    } catch (error: any) {
      console.error('Fetch Generation Detail Error:', error);
      return thunkAPI.rejectWithValue({ message: error.message || 'An unknown error occurred while fetching generation details.' });
    }
  }
);

// Thunk to delete a generation
export const deleteGeneration = createAsyncThunk<
  string, 
  string, 
  { rejectValue: { message: string } } 
>(
  'ui/deleteGeneration',
  async (generationId, thunkAPI) => {
    const state = thunkAPI.getState() as { auth: { token: string | null } };
    const token = state.auth.token;
    if (!token) {
      return thunkAPI.rejectWithValue({ message: 'Authentication token not found.' });
    }
    // --- MODIFICATION START: Prepend API URL ---
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/generations/${generationId}`;
    try {
      const response = await fetch(fullUrl, {
    // --- MODIFICATION END ---
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete generation' }));
         if (response.status === 404) {
             throw new Error('Generation not found.');
         } else if (response.status === 403) {
             throw new Error('Not authorized to delete this generation.');
         }
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return generationId; 
    } catch (error: any) {
      console.error('Delete Generation Error:', error);
      return thunkAPI.rejectWithValue({ message: error.message || 'An unknown error occurred while deleting the generation.' });
    }
  }
);

// --- NEW Thunk for Fetching Suggestions --- 
export const fetchSuggestions = createAsyncThunk<
  string[], // Return type: list of suggestions
  string, // Argument type: currentHtml
  { rejectValue: { message: string } } // Rejection type
>(
  'ui/fetchSuggestions',
  async (currentHtml, thunkAPI) => {
    const token = await getAuthToken(thunkAPI);
    if (typeof token === 'object' && token !== null && 'rejectWithValue' in token) return token;

    // --- Construct full API URL --- 
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/suggest-modifications`;
    console.log(`[fetchSuggestions] Making request to: ${fullUrl}`);
    // --- End URL construction ---

    try {
      // --- Use fullUrl ---
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ current_html: currentHtml }), // Match backend model
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch suggestions' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data: SuggestModificationsResponse = await response.json(); // Use backend response type
      // Check if backend returned an error message within the suggestions list
      if (data.suggestions && data.suggestions.length > 0 && data.suggestions[0].startsWith("Error:")) {
          throw new Error(data.suggestions[0]);
      }
      return data.suggestions;
    } catch (error: any) {
      console.error('Fetch Suggestions Error:', error);
      return thunkAPI.rejectWithValue({ message: error.message || 'An unknown error occurred while fetching suggestions.' });
    }
  }
);
// --- End NEW Thunk --- 

// --- Async thunk for AI-driven property extraction ---
export const extractComponentProperties = createAsyncThunk<
  ExtractedComponentProperties,
  { html: string; componentId: string },
  { rejectValue: string }
>(
  'ui/extractComponentProperties',
  async ({ html, componentId }, thunkAPI) => {
    const state = thunkAPI.getState() as { auth: { token: string | null } };
    const token = state.auth.token;
    if (!token) {
      return thunkAPI.rejectWithValue('Authentication token not found.');
    }
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/api/extract-component-properties`;
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ html, component_id: componentId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to extract properties' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data as ExtractedComponentProperties;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message || 'An unknown error occurred while extracting properties.');
    }
  }
);

// --- Types for property schema and extraction ---
export interface PropertySchema {
  name: string;
  label: string;
  type: 'string' | 'number' | 'color' | 'boolean' | 'select' | 'json_object_editor';
  options?: string[];
  liveUpdateSnippet?: string;
  htmlAttribute?: string;
  min?: number;
  max?: number;
  step?: number;
  [key: string]: any;
}

export interface ExtractedComponentProperties {
  propertySchema: PropertySchema[];
  values: Record<string, any>;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    clearGeneratedCode: (state) => {
      // console.log('clearGeneratedCode reducer called');
      state.generatedHtmlContent = null;
      state.error = null;
      state.modificationError = null;
      state.streamCompletedSuccessfully = false;
      state.htmlHistory = [];
      state.historyIndex = -1;
    },
    setLastPrompt: (state, action: PayloadAction<string>) => {
        state.lastPrompt = action.payload;
    },
    clearError: (state) => {
      state.error = null;
        state.modificationError = null;
    },
    streamStart: (state, action: PayloadAction<{ isGenerating?: boolean; isModifying?: boolean; prompt?: string }>) => {
        if (action.payload.isGenerating) {
            state.generatingFullCode = true;
            state.modifyingCode = false;
            state.isReplacingForCorrection = false;
            state.lastPrompt = action.payload.prompt || null;
            state.htmlHistory = []; // Reset history on new generation
            state.historyIndex = -1;
        } else if (action.payload.isModifying) {
            state.generatingFullCode = false;
            state.modifyingCode = true;
            state.isReplacingForCorrection = false;
            // For modification, history is managed in streamComplete
        }
        state.generatedHtmlContent = ''; // Always start with empty for a new stream
        state.error = null;
        state.modificationError = null;
        state.streamCompletedSuccessfully = false;
        state.isCorrectingSecurity = false;
        state.securityCorrectionError = null;
    },
    streamChunkReceived: (state, action: PayloadAction<{ chunk: string }>) => {
      let processingChunk = action.payload.chunk;
      let hasContentToAppend = true;

      // --- Signal Processing & Stripping Logic ---
      // Note: Order of checks might matter if signals can be combined in one chunk.

      if (processingChunk.includes('<!-- MORPHEO_SECURITY_CORRECTION_START -->')) {
        state.isCorrectingSecurity = true;
        state.securityCorrectionError = null;
        processingChunk = processingChunk.replace('<!-- MORPHEO_SECURITY_CORRECTION_START -->', '');
      }
      if (processingChunk.includes('<!-- MORPHEO_SECURITY_CORRECTION_END -->')) {
        state.isCorrectingSecurity = false;
        state.isReplacingForCorrection = false; // Ensure replacement mode also ends here
        processingChunk = processingChunk.replace('<!-- MORPHEO_SECURITY_CORRECTION_END -->', '');
      }
      if (processingChunk.includes('<!-- MORPHEO_SECURITY_CORRECTION_FAILED_AI_ERROR -->')) {
        state.isCorrectingSecurity = false;
        state.isReplacingForCorrection = false;
        state.securityCorrectionError = 'Automated security correction failed due to an AI error during the correction attempt.';
        processingChunk = processingChunk.replace('<!-- MORPHEO_SECURITY_CORRECTION_FAILED_AI_ERROR -->', '');
      }
      
      const warningMatch = processingChunk.match(/<!-- MORPHEO_SECURITY_WARNING: (.*?) -->/);
      if (warningMatch && warningMatch[0]) {
        state.securityCorrectionError = warningMatch[1];
        processingChunk = processingChunk.replace(warningMatch[0], '');
      }

      // This signal is critical for clearing old content
      if (processingChunk.includes('<!-- MORPHEO_REPLACE_WITH_CORRECTED_START -->')) {
        state.generatedHtmlContent = ''; // Clear previously accumulated (unsafe) content
        state.isReplacingForCorrection = true;
        state.isCorrectingSecurity = true; // Usually correction involves replacement
        state.securityCorrectionError = null; 
        state.htmlHistory = []; // Reset history for the new content
        state.historyIndex = -1;
        // Get content *after* this signal in the current chunk
        processingChunk = processingChunk.substring(processingChunk.indexOf('<!-- MORPHEO_REPLACE_WITH_CORRECTED_START -->') + '<!-- MORPHEO_REPLACE_WITH_CORRECTED_START -->'.length);
      }
      
      // This signal indicates the end of the corrected content stream
      if (processingChunk.includes('<!-- MORPHEO_REPLACE_WITH_CORRECTED_END -->')) {
        // isReplacingForCorrection is typically set to false by MORPHEO_SECURITY_CORRECTION_END,
        // but if this comes separately or later, ensure it's false.
        state.isReplacingForCorrection = false; 
        // Get content *before* this signal in the current chunk
        processingChunk = processingChunk.substring(0, processingChunk.indexOf('<!-- MORPHEO_REPLACE_WITH_CORRECTED_END -->'));
      }

      // --- Append actual content --- 
      // Only append if processingChunk has non-whitespace characters left
      if (processingChunk.trim() !== '') {
        // Basic cleaning for markdown code fences before appending
        let cleanedChunk = processingChunk.replace(/^\s*```html\s*\n?/im, '');
        cleanedChunk = cleanedChunk.replace(/\n?\s*```\s*$/im, '');
        
        state.generatedHtmlContent = (state.generatedHtmlContent || '') + cleanedChunk.trim(); // Trim the cleaned chunk too
      } else {
        // If, after stripping signals, the chunk is empty, we might not need to do anything further with appending.
        // This prevents appending empty strings, but state changes from signals above would have already occurred.
        hasContentToAppend = false;
      }
      // The original `return` statements for some signals are removed to allow content within the same chunk
      // (before/after a signal) to be processed and appended if it exists.
    },
    streamComplete: (state, action: PayloadAction<{ isGenerating?: boolean; isModifying?: boolean }>) => {
      let finalHtml = state.generatedHtmlContent || '';
      // Basic cleaning for markdown code fences
      finalHtml = finalHtml.replace(/^\s*```html\s*\n?/im, ''); // Remove ```html at the beginning
      finalHtml = finalHtml.replace(/\n?\s*```\s*$/im, ''); // Remove ``` at the end
      state.generatedHtmlContent = finalHtml.trim();
        
      if (action.payload.isGenerating) {
        state.generatingFullCode = false;
        if (state.generatedHtmlContent !== null && state.generatedHtmlContent.trim() !== '') {
          state.htmlHistory = [state.generatedHtmlContent];
          state.historyIndex = 0;
        } else {
          state.htmlHistory = [];
          state.historyIndex = -1;
        }
      } else if (action.payload.isModifying) {
        state.modifyingCode = false;
        if (state.generatedHtmlContent !== null && state.generatedHtmlContent.trim() !== '') {
          state.htmlHistory.push(state.generatedHtmlContent);
          state.historyIndex = state.htmlHistory.length - 1;
        }
      }
      state.streamCompletedSuccessfully = !!state.generatedHtmlContent;
      state.isCorrectingSecurity = false;
      state.isReplacingForCorrection = false;
    },
    streamError: (state, action: PayloadAction<{ message: string; isGenerating?: boolean; isModifying?: boolean }>) => {
       if (action.payload.isGenerating) {
            state.generatingFullCode = false;
            state.error = action.payload.message;
            state.htmlHistory = [];
            state.historyIndex = -1;
        } else if (action.payload.isModifying) {
            state.modifyingCode = false;
            state.modificationError = action.payload.message;
        }
        state.streamCompletedSuccessfully = false;
        state.generatedHtmlContent = null;
        state.isCorrectingSecurity = false;
        state.isReplacingForCorrection = false;
        state.securityCorrectionError = null;
    },
    setLoadedGeneration: (state, action: PayloadAction<GenerationDetail>) => {
        state.generatedHtmlContent = action.payload.htmlContent;
        state.lastPrompt = action.payload.prompt; 
        state.streamCompletedSuccessfully = true; 
        state.error = null; 
        state.modificationError = null;
        state.generatingFullCode = false; 
        state.modifyingCode = false;
        state.htmlHistory = [action.payload.htmlContent]; 
        state.historyIndex = 0;
        state.loadedGenerationHtml = action.payload.htmlContent;
        state.loadedGenerationPrompt = action.payload.prompt;
    },
    clearLoadedGenerationFlags: (state) => {
        state.loadedGenerationHtml = null;
        state.loadedGenerationPrompt = null;
    },
    undoModification: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.generatedHtmlContent = state.htmlHistory[state.historyIndex];
        state.streamCompletedSuccessfully = true; 
        state.error = null; 
        state.modificationError = null;
      }
    },
    redoModification: (state) => {
      if (state.historyIndex < state.htmlHistory.length - 1) {
        state.historyIndex++;
        state.generatedHtmlContent = state.htmlHistory[state.historyIndex];
        state.streamCompletedSuccessfully = true;
        state.error = null;
        state.modificationError = null;
      }
    },
    setFullGeneratedHtml: (state, action: PayloadAction<string | null>) => {
        let htmlToSet = action.payload || '';
        // Basic cleaning for markdown code fences
        htmlToSet = htmlToSet.replace(/^\s*```html\s*\n?/im, '');
        htmlToSet = htmlToSet.replace(/\n?\s*```\s*$/im, '');
        state.generatedHtmlContent = htmlToSet.trim();

        state.generatingFullCode = false; // Assume generation is complete
        state.modifyingCode = false;
        state.error = null;
        state.modificationError = null;
        state.streamCompletedSuccessfully = !!state.generatedHtmlContent; // True if content exists
        // Reset history when setting full content 
        if (state.generatedHtmlContent) {
          state.htmlHistory = [state.generatedHtmlContent];
          state.historyIndex = 0;
        } else {
          state.htmlHistory = [];
          state.historyIndex = -1;
        }
        state.loadedGenerationHtml = null;
        state.loadedGenerationPrompt = null;
    },
    setLiveUpdateCommand: (state, action: PayloadAction<{ targetId: string; propertySchema: any; newValue: any }>) => {
      state.liveUpdateCommandForPreview = action.payload;
    },
    clearLiveUpdateCommand: (state) => {
      state.liveUpdateCommandForPreview = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate Full Code (Streaming - OLD THUNK) Reducers
      .addCase(generateFullCode.pending, (state, action) => {
        const prompt = action.meta.arg;
        uiSlice.caseReducers.streamStart(state, { payload: { isGenerating: true, prompt: prompt }, type: 'ui/streamStart' });
      })
      .addCase(generateFullCode.fulfilled, (state, action: PayloadAction<string>) => {
        uiSlice.caseReducers.streamComplete(state, { payload: { isGenerating: true }, type: 'ui/streamComplete' });
      })
      .addCase(generateFullCode.rejected, (state, action) => {
        // Error is dispatched within the thunk now via streamError for generateFullCode too
        // This reducer primarily handles the state transition if the thunk itself is rejected
        // before or after streaming starts but not due to a stream-signaled error.
        if (state.generatingFullCode) { // If it was generating and got rejected outside streamError handling
             state.generatingFullCode = false; 
             state.error = action.payload as string || 'Failed pre-flight generation check';
             state.htmlHistory = [];
             state.historyIndex = -1;
        } else if (!state.error) { // If not already set by streamError
             state.generatingFullCode = false;
             state.error = action.payload as string || 'Failed pre-flight generation check';
             state.htmlHistory = [];
             state.historyIndex = -1;
        }
      })
      
      // --- REVISED: Add cases for generateCodeWithFiles (Now Streaming) ---
      .addCase(generateCodeWithFiles.pending, (state, action) => {
          // console.log('Reducer: generateCodeWithFiles.pending (streaming)');
          // streamStart is now dispatched from within the thunk itself upon successful connection
          // So, here we just set the initial loading state for the overall thunk
          state.generatingFullCode = true; // Indicates the thunk is running
          state.modifyingCode = false;
          state.error = null;
          state.modificationError = null;
          state.streamCompletedSuccessfully = false;
          state.generatedHtmlContent = null; // Clear previous content
          state.lastPrompt = action.meta.arg.prompt; // Save the prompt
          state.htmlHistory = []; // Reset history
          state.historyIndex = -1;
          state.loadedGenerationHtml = null;
          state.loadedGenerationPrompt = null;
      })
      .addCase(generateCodeWithFiles.fulfilled, (state, action: PayloadAction<string>) => {
          // console.log('Reducer: generateCodeWithFiles.fulfilled (streaming).');
          // console.log('[generateCodeWithFiles.fulfilled] action.payload (first 500 chars):', action.payload ? action.payload.substring(0, 500) + '...' : 'null_or_empty');
          
          // --- FIX: Directly use action.payload to set generatedHtmlContent ---
          // The streamChunkReceived actions dispatched during the thunk might not have updated the state
          // that this specific fulfilled reducer instance sees. The action.payload IS the complete content.
          state.generatedHtmlContent = action.payload; 
          // console.log('[generateCodeWithFiles.fulfilled] state.generatedHtmlContent AFTER setting from action.payload (first 500 chars):', state.generatedHtmlContent ? state.generatedHtmlContent.substring(0, 500) + '...' : 'null_or_empty');

          uiSlice.caseReducers.streamComplete(state, { payload: { isGenerating: true }, type: 'ui/streamComplete' });
          // generatingFullCode is set to false within streamComplete.
          // streamCompletedSuccessfully is set within streamComplete.
      })
      .addCase(generateCodeWithFiles.rejected, (state, action) => {
          // console.log('Reducer: generateCodeWithFiles.rejected (streaming)', action.payload);
          // streamError is dispatched from within the thunk for stream-related errors or HTTP errors before stream.
          // This reducer handles the state transition if the thunk itself is rejected for other reasons
          // or if streamError didn't already set these states.
          if (state.generatingFullCode) { // If it was generating
            state.generatingFullCode = false;
            if (!state.error) { // Only set error if streamError didn't already set it
                state.error = action.payload ?? 'Failed to generate UI with files.';
            }
            state.streamCompletedSuccessfully = false;
            // generatedHtmlContent might have partial data if stream broke; streamError should nullify it.
            // If not nullified by streamError, ensure it's cleared here if an overall rejection occurs.
            if (!state.error) state.generatedHtmlContent = null; 
            state.htmlHistory = []; 
            state.historyIndex = -1;
          } else if (!state.error) { // If not generating but still rejected and no prior error
            state.error = action.payload ?? 'Failed to generate UI with files.';
          }
      })
      // Modify Generated Code Reducers
      .addCase(modifyGeneratedCode.pending, (state) => {
        uiSlice.caseReducers.streamStart(state, { payload: { isModifying: true }, type: 'ui/streamStart' });
      })
      .addCase(modifyGeneratedCode.fulfilled, (state, action: PayloadAction<string>) => {
        uiSlice.caseReducers.streamComplete(state, { payload: { isModifying: true }, type: 'ui/streamComplete' });
      })
      .addCase(modifyGeneratedCode.rejected, (state, action) => {
         // Similar to generateFullCode, streamError would be dispatched from thunk if applicable
         if (state.modifyingCode) { 
             state.modifyingCode = false;
             state.modificationError = action.payload as string || 'Failed pre-flight modification check';
         } else if (!state.modificationError) {
             state.modifyingCode = false;
             state.modificationError = action.payload as string || 'Failed pre-flight modification check';
         }
      })
      // Save Generation Reducers
      .addCase(saveGeneration.pending, (state) => {
        // console.log('Saving generation...');
      })
      .addCase(saveGeneration.fulfilled, (state, action) => {
        console.log("Generation saved:", action.payload.id);
      })
      .addCase(saveGeneration.rejected, (state, action) => {
        console.error("Save failed:", action.payload?.message);
      })
      // Fetch Generations Reducers
      .addCase(fetchGenerations.pending, (state) => {
        state.loadingGenerations = true;
        state.loadingGenerationsError = null;
      })
      .addCase(fetchGenerations.fulfilled, (state, action: PayloadAction<GenerationInfo[]>) => {
        state.loadingGenerations = false;
        state.savedGenerations = action.payload;
      })
      .addCase(fetchGenerations.rejected, (state, action) => {
        state.loadingGenerations = false;
        state.loadingGenerationsError = action.payload?.message ?? 'Failed to load generations.';
      })
      // Fetch Generation Detail Reducers
      .addCase(fetchGenerationDetail.pending, (state) => {
        state.loadingGenerationDetail = true;
        state.loadingGenerationDetailError = null;
        state.currentGenerationDetail = null; 
        state.loadedGenerationHtml = null; 
        state.loadedGenerationPrompt = null;
      })
      .addCase(fetchGenerationDetail.fulfilled, (state, action: PayloadAction<GenerationDetail>) => {
        state.loadingGenerationDetail = false;
        state.currentGenerationDetail = action.payload; 
        uiSlice.caseReducers.setLoadedGeneration(state, action); 
      })
      .addCase(fetchGenerationDetail.rejected, (state, action) => {
        state.loadingGenerationDetail = false;
        state.loadingGenerationDetailError = action.payload?.message ?? 'Failed to load generation details.';
        state.loadedGenerationHtml = null; 
        state.loadedGenerationPrompt = null;
      })
      // Delete Generation Reducers
      .addCase(deleteGeneration.pending, (state) => {
        console.log('Deleting generation...');
      })
      .addCase(deleteGeneration.fulfilled, (state, action: PayloadAction<string>) => {
        state.savedGenerations = state.savedGenerations.filter(gen => gen.id !== action.payload);
        console.log(`Generation ${action.payload} deleted successfully.`);
      })
      .addCase(deleteGeneration.rejected, (state, action) => {
        console.error('Delete Generation Rejected:', action.payload?.message);
      })
      // Suggestions Reducers
      .addCase(fetchSuggestions.pending, (state) => {
        state.loadingSuggestions = true;
        state.suggestionsError = null;
        state.suggestions = [];
      })
      .addCase(fetchSuggestions.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.loadingSuggestions = false;
        state.suggestions = action.payload;
      })
      .addCase(fetchSuggestions.rejected, (state, action) => {
        state.loadingSuggestions = false;
        state.suggestionsError = action.payload?.message ?? 'Failed to load suggestions.';
      })
      // --- NEW: Add cases for modifyCodeWithFiles (Streaming FormData) ---
      .addCase(modifyCodeWithFiles.pending, (state, action) => {
          // console.log('Reducer: modifyCodeWithFiles.pending (streaming)');
          // streamStart is dispatched from within the thunk itself
          state.modifyingCode = true; // Set overall thunk loading state
          state.generatingFullCode = false;
          state.modificationError = null; // Clear previous modification error
          state.error = null;
          state.streamCompletedSuccessfully = false;
          // Do NOT clear generatedHtmlContent here, modification works on existing content
          // Do NOT reset history here, streamComplete will handle adding the new state
      })
      .addCase(modifyCodeWithFiles.fulfilled, (state, action: PayloadAction<string>) => {
          // console.log('Reducer: modifyCodeWithFiles.fulfilled (streaming)');
          // console.log('[modifyCodeWithFiles.fulfilled] action.payload (first 500 chars):', action.payload ? action.payload.substring(0, 500) + '...' : 'null_or_empty');
          
          // --- FIX: Directly use action.payload to set generatedHtmlContent ---
          state.generatedHtmlContent = action.payload; 
          // console.log('[modifyCodeWithFiles.fulfilled] state.generatedHtmlContent AFTER setting from action.payload (first 500 chars):', state.generatedHtmlContent ? state.generatedHtmlContent.substring(0, 500) + '...' : 'null_or_empty');

          // streamComplete handles cleaning, setting state.modifyingCode=false, and history
          uiSlice.caseReducers.streamComplete(state, { payload: { isModifying: true }, type: 'ui/streamComplete' });
      })
      .addCase(modifyCodeWithFiles.rejected, (state, action) => {
          // console.log('Reducer: modifyCodeWithFiles.rejected (streaming)', action.payload);
          // streamError dispatched in thunk handles stream/HTTP errors
          if (state.modifyingCode) { // If it was modifying and got rejected outside streamError
             state.modifyingCode = false; 
             if (!state.modificationError) { // Only set if not already set by streamError
                 state.modificationError = action.payload ?? 'Failed to modify UI with files.';
             }
             state.streamCompletedSuccessfully = false;
             // Content reverts implicitly by not changing state.generatedHtmlContent here
          } else if (!state.modificationError) { // If not modifying but still rejected & no prior error
             state.modificationError = action.payload ?? 'Failed to modify UI with files.';
          }
      })
      // Extract component properties
      .addCase(extractComponentProperties.pending, (state) => {
        state.loadingSuggestions = true; // Reuse loading state for now
        state.suggestionsError = null;
      })
      .addCase(extractComponentProperties.fulfilled, (state, action: PayloadAction<ExtractedComponentProperties>) => {
        state.loadingSuggestions = false;
        state.suggestionsError = null;
        // Store the extracted schema/values in a generic way for now
        (state as any).extractedPropertySchema = action.payload.propertySchema;
        (state as any).extractedPropertyValues = action.payload.values;
      })
      .addCase(extractComponentProperties.rejected, (state, action) => {
        state.loadingSuggestions = false;
        state.suggestionsError = action.payload || 'Failed to extract component properties.';
      })
  },
});

export const {
  clearGeneratedCode,
  streamStart,
  streamChunkReceived,
  streamComplete,
  streamError,
  setLastPrompt,
  clearError,
  setLoadedGeneration,
  clearLoadedGenerationFlags,
  undoModification,
  redoModification,
  setFullGeneratedHtml,
  setLiveUpdateCommand,
  clearLiveUpdateCommand,
} = uiSlice.actions;

// --- Add Selectors ---
export const selectGeneratedHtmlContent = (state: { ui: UIState }) => state.ui.generatedHtmlContent;
export const selectIsGeneratingFullCode = (state: { ui: UIState }) => state.ui.generatingFullCode;
export const selectIsModifyingCode = (state: { ui: UIState }) => state.ui.modifyingCode;
export const selectStreamCompletedSuccessfully = (state: { ui: UIState }) => state.ui.streamCompletedSuccessfully;
export const selectError = (state: { ui: UIState }) => state.ui.error;
export const selectModificationError = (state: { ui: UIState }) => state.ui.modificationError;
export const selectIsCorrectingSecurity = (state: { ui: UIState }) => state.ui.isCorrectingSecurity;
export const selectSecurityCorrectionError = (state: { ui: UIState }) => state.ui.securityCorrectionError;
export const selectLastPrompt = (state: { ui: UIState }) => state.ui.lastPrompt;
export const selectIsReplacingForCorrection = (state: { ui: UIState }) => state.ui.isReplacingForCorrection;
// Add other selectors as needed

export default uiSlice.reducer; 