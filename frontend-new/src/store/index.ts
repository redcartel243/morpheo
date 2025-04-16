import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import { componentReducer } from '../components/ui/intelligent/ComponentReducer';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    theme: themeReducer,
    components: componentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/setUser'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.metadata', 'payload.providerData'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user.metadata', 'auth.user.providerData'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 