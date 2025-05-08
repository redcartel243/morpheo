import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { User as FirebaseUser } from 'firebase/auth';
import { loginUser, registerUser, logoutUser, auth } from '../../config/firebase';

// Define types
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  token: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  token: null,
};

// Helper function to convert Firebase user to our User type
const mapFirebaseUserToUser = (firebaseUser: FirebaseUser): User => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // First authenticate with Firebase
      const firebaseUser = await loginUser(email, password);
      
      // Then get a token from Firebase
      // const token = await firebaseUser.getIdToken(); // Token handled by listener
      
      // REMOVE Authenticate with the backend logic
      /*
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/token`, {
          username: email,
          password: password
        });
        
        console.log('Backend authentication successful:', response.data);
        
        // --- REMOVE STORE TOKEN IN LOCALSTORAGE --- 
        // if (response.data.access_token) {
        //   localStorage.setItem('token', response.data.access_token);
        //   console.log('[authSlice] Stored backend token in localStorage');
        // } else {
        //   console.error('[authSlice] Backend token endpoint did not return an access_token!');
        // }
        // --- END REMOVE STORE TOKEN --- 
        
        // Remove setting the token in axios headers here
        // axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        return firebaseUser;
      } catch (backendError: any) {
        console.warn('Backend authentication failed, using Firebase only:', backendError);
        // Remove setting the token in axios headers here
        // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return firebaseUser;
      }
      */
      // Simply return the Firebase user, listener will handle token state
      return firebaseUser;

    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // First register with Firebase
      const firebaseUser = await registerUser(email, password);
      
      // Then get a token from Firebase
      // const token = await firebaseUser.getIdToken(); // Token handled by listener
      
      // Remove setting the token in axios headers here
      // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return firebaseUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutUser();
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

// Create slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false;
      state.error = null;
      if (!action.payload) {
        state.token = null;
      }
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
      state.user = null;
      state.token = null;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = mapFirebaseUserToUser(action.payload);
        state.isAuthenticated = true;
        
        // Remove setting axios header here - listener handles token state
        /*
        if (action.payload) {
          action.payload.getIdToken().then((token: string) => {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          });
        }
        */
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = mapFirebaseUserToUser(action.payload);
        state.isAuthenticated = true;
        
        // Remove setting axios header here - listener handles token state
        /*
        if (action.payload) {
          action.payload.getIdToken().then((token: string) => {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          });
        }
        */
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        
        // --- Remove backend token removal --- 
        // localStorage.removeItem('token');
        // console.log('[authSlice] Removed backend token from localStorage');
        // --- END REMOVE TOKEN --- 
        
        // Remove resetting axios default headers
        // delete axios.defaults.headers.common['Authorization'];
      })
      .addCase(logoutAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser, setAuthLoading, setAuthError, setToken } = authSlice.actions;

// Setup Firebase auth state listener
export const setupAuthListener = (dispatch: any) => {
  dispatch(setAuthLoading(true)); // Signal that we are checking auth state
  return auth.onAuthStateChanged(async (user: FirebaseUser | null) => {
    if (user) {
        console.log('Listener: User logged in', user.uid);
        try {
          // Get ID token
          const token = await user.getIdToken(true);
          console.log('Listener: Token obtained');
          
          // Dispatch token to Redux state
          dispatch(setToken(token));
          
          // Dispatch user info to Redux state
          const serializableUser = mapFirebaseUserToUser(user);
          dispatch(setUser(serializableUser));
          
          // Remove setting axios defaults here
          // axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
        } catch (error: any) {
            console.error("Listener: Error getting ID token:", error);
            dispatch(setAuthError(error.message || 'Failed to get authentication token.'));
            dispatch(setToken(null)); // Ensure token is null on error
        }
    } else {
      console.log('Listener: User logged out');
      // Dispatch null user and token
      dispatch(setUser(null));
      dispatch(setToken(null)); // Ensure token is cleared
      
      // Remove resetting axios defaults here
      // delete axios.defaults.headers.common['Authorization'];
      
      dispatch(setAuthLoading(false)); // Ensure loading is set to false even on logout
    }
  }, (error) => {
      // Handle listener errors
      console.error("Firebase Auth Listener Error:", error);
      dispatch(setAuthError(error.message || 'Authentication listener failed.'));
      dispatch(setUser(null));
      dispatch(setToken(null));
  });
};

export default authSlice.reducer; 