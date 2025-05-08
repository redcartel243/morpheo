import { createSlice, createAsyncThunk, PayloadAction, Dispatch } from '@reduxjs/toolkit';
import { auth } from '../../config/firebase'; // For getting the token
import { GenerationInfo, GenerationDetail } from '../../types'; // <-- Revert path back to ../../types
import { setLoadedGeneration } from './uiSlice'; // <-- Import action from uiSlice

export interface GenerationsState {
  items: GenerationInfo[];
  loading: boolean;
  error: string | null;
}

const initialState: GenerationsState = {
  items: [],
  loading: false,
  error: null,
};

// Thunk to fetch generations from the backend
export const fetchGenerations = createAsyncThunk<
    GenerationInfo[], // Return type on success
    void, // Argument type (none needed here)
    { rejectValue: { message: string } } // Return type on failure
>(
  'generations/fetchGenerations',
  async (_, { rejectWithValue }) => {
    console.log('[generationsSlice] Fetching generations...');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const token = await currentUser.getIdToken();
      if (!token) {
        throw new Error('Failed to retrieve Firebase ID token for fetching generations.');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/generations`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Fetch failed! Status: ${response.status}` }));
        throw new Error(errorData.detail || `Fetch failed! Status: ${response.status}`);
      }

      const data: GenerationInfo[] = await response.json();
      console.log('[generationsSlice] Fetched generations successfully:', data.length);
      // Ensure date strings are converted to Date objects if necessary (Firestore often returns Timestamps)
      return data.map(gen => ({
          ...gen,
          createdAt: new Date(gen.createdAt) // Convert timestamp/string to Date
      }));

    } catch (error: any) {
      console.error('Error fetching generations:', error);
      return rejectWithValue({ message: error.message || 'Failed to fetch generations' });
    }
  }
);

// --- NEW: Thunk for deleting a generation --- 
export const deleteGeneration = createAsyncThunk<
    string, // Return the ID of the deleted item on success
    string, // Argument is the ID to delete
    { rejectValue: { message: string } } // Return type on failure
>(
  'generations/deleteGeneration',
  async (generationId, { rejectWithValue }) => {
    console.log(`[generationsSlice] Deleting generation ${generationId}...`);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const token = await currentUser.getIdToken();
      if (!token) {
        throw new Error('Failed to retrieve Firebase ID token for deleting generation.');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/generations/${generationId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      // DELETE requests often return 204 No Content on success
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({ detail: `Delete failed! Status: ${response.status}` }));
        throw new Error(errorData.detail || `Delete failed! Status: ${response.status}`);
      }

      console.log(`[generationsSlice] Deleted generation ${generationId} successfully.`);
      return generationId; // Return the ID to identify which item to remove from state

    } catch (error: any) {
      console.error('Error deleting generation:', error);
      return rejectWithValue({ message: error.message || 'Failed to delete generation' });
    }
  }
);
// --- END NEW Thunk --- 

// --- NEW: Thunk for fetching generation details --- 
export const fetchGenerationDetail = createAsyncThunk<
    GenerationDetail, // Return type on success
    string, // Argument is the ID to fetch
    { dispatch: Dispatch, rejectValue: { message: string } } // Include dispatch in thunk API
>(
  'generations/fetchGenerationDetail',
  async (generationId, { dispatch, rejectWithValue }) => {
    console.log(`[generationsSlice] Fetching detail for generation ${generationId}...`);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not logged in.');
      const token = await currentUser.getIdToken();
      if (!token) throw new Error('Failed to retrieve Firebase ID token for fetching detail.');

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/generations/${generationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Fetch detail failed! Status: ${response.status}` }));
        throw new Error(errorData.detail || `Fetch detail failed! Status: ${response.status}`);
      }

      const data: GenerationDetail = await response.json();
      console.log(`[generationsSlice] Fetched detail for ${generationId} successfully.`);
      
      // Dispatch action to uiSlice to store the loaded content
      dispatch(setLoadedGeneration(data));

      // Also convert date for consistency if needed, though we don't store it here directly
      return { ...data, createdAt: new Date(data.createdAt) };

    } catch (error: any) {
      console.error('Error fetching generation detail:', error);
      return rejectWithValue({ message: error.message || 'Failed to fetch generation detail' });
    }
  }
);
// --- END NEW Thunk --- 

const generationsSlice = createSlice({
  name: 'generations',
  initialState,
  reducers: {
    // Potential future reducers: e.g., updateGeneration, addGenerationOptimistic
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Handlers --- 
      .addCase(fetchGenerations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGenerations.fulfilled, (state, action: PayloadAction<GenerationInfo[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchGenerations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load generations.';
      })
      // --- Delete Handlers --- 
      .addCase(deleteGeneration.pending, (state) => {
        // Optionally set a specific deleting flag or handle loading state
        state.loading = true; // Reuse general loading or add specific one
        state.error = null; // Clear previous errors
      })
      .addCase(deleteGeneration.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        // Remove the deleted item from the state array
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteGeneration.rejected, (state, action) => {
        state.loading = false;
        // Set error message specific to deletion failure
        state.error = action.payload?.message || 'Failed to delete generation.';
      })
      // --- Detail Fetch Handlers (Optional: Can add pending/rejected for specific loading/error states) ---
      .addCase(fetchGenerationDetail.pending, (state) => {
        // Optionally set a loading flag specifically for detail view
        state.loading = true; 
        state.error = null;
      })
      .addCase(fetchGenerationDetail.fulfilled, (state) => {
        // Detail is stored in uiSlice, just clear loading here
        state.loading = false;
      })
      .addCase(fetchGenerationDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to load generation detail.';
      });
  },
});

// Export actions if any reducers are added later
// export const { } = generationsSlice.actions;

export default generationsSlice.reducer; 