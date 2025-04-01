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
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 