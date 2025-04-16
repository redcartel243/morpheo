import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
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
      const token = await firebaseUser.getIdToken();
      
      // Authenticate with the backend
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/token`, {
          username: email,
          password: password
        });
        
        console.log('Backend authentication successful:', response.data);
        
        // Set the token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        return firebaseUser;
      } catch (backendError: any) {
        console.warn('Backend authentication failed, using Firebase only:', backendError);
        // If backend auth fails, we still return the Firebase user
        // but set the Firebase token in the headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return firebaseUser;
      }
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
      const token = await firebaseUser.getIdToken();
      
      // Set the token in axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
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
    setUser: (state, action) => {
      if (action.payload) {
        state.user = mapFirebaseUserToUser(action.payload);
        state.isAuthenticated = true;
      } else {
        state.user = null;
        state.isAuthenticated = false;
      }
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
        
        // Set default Authorization header for axios if needed
        if (action.payload) {
          action.payload.getIdToken().then((token: string) => {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          });
        }
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
        
        // Set default Authorization header for axios if needed
        if (action.payload) {
          action.payload.getIdToken().then((token: string) => {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          });
        }
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
        
        // Reset axios default headers
        delete axios.defaults.headers.common['Authorization'];
      })
      .addCase(logoutAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;

// Setup Firebase auth state listener
export const setupAuthListener = (dispatch: any) => {
  return auth.onAuthStateChanged((user: any) => {
    // Map Firebase user object to a plain serializable object
    if (user) {
      // Create a serializable user object
      const serializableUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        createdAt: user.metadata?.creationTime,
        lastLoginAt: user.metadata?.lastSignInTime
      };
      
      dispatch(setUser(serializableUser));
      
      // Set axios headers if user is logged in
      user.getIdToken().then((token: string) => {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      });
    } else {
      dispatch(setUser(null));
      delete axios.defaults.headers.common['Authorization'];
    }
  });
};

export default authSlice.reducer; 