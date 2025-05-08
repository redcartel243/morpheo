import React, { ReactNode } from 'react';
import { createStateManager, createAction, createLoggerMiddleware, StateAction } from './StateManager';
import {
  createDerivedState
} from './StateManager';
import {
  createThunkMiddleware,
  createSubscriptionMiddleware,
  createDebounceMiddleware,
  createThrottleMiddleware
} from './middleware';

// Define base types for application state
export interface AppState {
  ui: UIState;
  forms: FormsState;
  data: DataState;
  auth: AuthState;
  notifications: Notification[];
  metrics: {
    counts: Record<string, number>;
  };
}

// UI State Module
export interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  activeModal: string | null;
  notifications: Notification[];
  toast: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    visible: boolean;
  } | null;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
}

// Forms State Module
export interface FormsState {
  forms: Record<string, FormState>;
  validationRules: Record<string, FormValidationRules>;
}

export interface FormState {
  values: Record<string, any>;
  touched: Record<string, boolean>;
  errors: Record<string, string | null>;
  dirty: boolean;
  submitting: boolean;
  submitted: boolean;
  valid: boolean;
}

export interface FormValidationRules {
  [field: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    validate?: (value: any, formValues: Record<string, any>) => string | null;
  };
}

// Data State Module
export interface DataState {
  loading: Record<string, boolean>;
  entities: {
    [entityType: string]: {
      byId: Record<string, any>;
      allIds: string[];
    };
  };
  cache: {
    [key: string]: {
      data: any;
      timestamp: number;
      expiresAt: number;
    };
  };
}

// Auth State Module
export interface AuthState {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    role: string | null;
  };
  authenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  loading: boolean;
  error: string | null;
}

// Initial state for the application
const initialState: AppState = {
  ui: {
    darkMode: false,
    sidebarOpen: true,
    activeModal: null,
    notifications: [],
    toast: null
  },
  forms: {
    forms: {},
    validationRules: {}
  },
  data: {
    loading: {},
    entities: {},
    cache: {}
  },
  auth: {
    user: {
      id: null,
      name: null,
      email: null,
      role: null
    },
    authenticated: false,
    token: null,
    refreshToken: null,
    expiresAt: null,
    loading: false,
    error: null
  },
  notifications: [],
  metrics: {
    counts: {}
  },
};

// Define reducers
// UI Reducer
const uiReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'ui/SET_DARK_MODE':
      return {
        ...state,
        ui: {
          ...state.ui,
          darkMode: action.payload
        }
      };
    case 'ui/TOGGLE_DARK_MODE':
      return {
        ...state,
        ui: {
          ...state.ui,
          darkMode: !state.ui.darkMode
        }
      };
    case 'ui/TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen
        }
      };
    case 'ui/SET_ACTIVE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeModal: action.payload
        }
      };
    case 'ui/ADD_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            {
              id: action.payload.id || Date.now().toString(),
              message: action.payload.message,
              type: action.payload.type || 'info',
              read: false,
              timestamp: action.payload.timestamp || Date.now()
            }
          ]
        }
      };
    case 'ui/MARK_NOTIFICATION_READ':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.map(notification => 
            notification.id === action.payload
              ? { ...notification, read: true }
              : notification
          )
        }
      };
    case 'ui/REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(
            notification => notification.id !== action.payload
          )
        }
      };
    case 'ui/SHOW_TOAST':
      return {
        ...state,
        ui: {
          ...state.ui,
          toast: {
            message: action.payload.message,
            type: action.payload.type || 'info',
            visible: true
          }
        }
      };
    case 'ui/HIDE_TOAST':
      return {
        ...state,
        ui: {
          ...state.ui,
          toast: state.ui.toast ? { ...state.ui.toast, visible: false } : null
        }
      };
    default:
      return state;
  }
};

// Forms Reducer
const formsReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'forms/INITIALIZE_FORM':
      return {
        ...state,
        forms: {
          ...state.forms,
          forms: {
            ...state.forms.forms,
            [action.payload.formId]: {
              values: action.payload.initialValues || {},
              touched: {},
              errors: {},
              dirty: false,
              submitting: false,
              submitted: false,
              valid: true
            }
          },
          validationRules: {
            ...state.forms.validationRules,
            [action.payload.formId]: action.payload.validationRules || {}
          }
        }
      };
    case 'forms/SET_FORM_VALUE':
      const { formId, field, value } = action.payload;
      const form = state.forms.forms[formId];
      
      if (!form) return state;
      
      const newValues = {
        ...form.values,
        [field]: value
      };
      
      // Validate the field if validation rules exist
      const validationRules = state.forms.validationRules[formId]?.[field];
      let fieldError: string | null = null;
      
      if (validationRules) {
        if (validationRules.required && (!value || value === '')) {
          fieldError = 'This field is required';
        } else if (validationRules.minLength && value && value.length < validationRules.minLength) {
          fieldError = `Minimum length is ${validationRules.minLength} characters`;
        } else if (validationRules.maxLength && value && value.length > validationRules.maxLength) {
          fieldError = `Maximum length is ${validationRules.maxLength} characters`;
        } else if (validationRules.pattern && value && !validationRules.pattern.test(value)) {
          fieldError = 'Invalid format';
        } else if (validationRules.validate) {
          fieldError = validationRules.validate(value, newValues);
        }
      }
      
      const newErrors = {
        ...form.errors,
        [field]: fieldError
      };
      
      // Check if the form is valid
      const valid = Object.values(newErrors).every(error => error === null || error === undefined);
      
      return {
        ...state,
        forms: {
          ...state.forms,
          forms: {
            ...state.forms.forms,
            [formId]: {
              ...form,
              values: newValues,
              touched: {
                ...form.touched,
                [field]: true
              },
              errors: newErrors,
              dirty: true,
              valid
            }
          }
        }
      };
    case 'forms/SET_FORM_TOUCHED':
      return {
        ...state,
        forms: {
          ...state.forms,
          forms: {
            ...state.forms.forms,
            [action.payload.formId]: {
              ...state.forms.forms[action.payload.formId],
              touched: {
                ...state.forms.forms[action.payload.formId].touched,
                [action.payload.field]: true
              }
            }
          }
        }
      };
    case 'forms/SUBMIT_FORM':
      return {
        ...state,
        forms: {
          ...state.forms,
          forms: {
            ...state.forms.forms,
            [action.payload]: {
              ...state.forms.forms[action.payload],
              submitting: true
            }
          }
        }
      };
    case 'forms/SUBMIT_FORM_SUCCESS':
      return {
        ...state,
        forms: {
          ...state.forms,
          forms: {
            ...state.forms.forms,
            [action.payload]: {
              ...state.forms.forms[action.payload],
              submitting: false,
              submitted: true
            }
          }
        }
      };
    case 'forms/SUBMIT_FORM_ERROR':
      return {
        ...state,
        forms: {
          ...state.forms,
          forms: {
            ...state.forms.forms,
            [action.payload.formId]: {
              ...state.forms.forms[action.payload.formId],
              submitting: false,
              errors: {
                ...state.forms.forms[action.payload.formId].errors,
                ...action.payload.errors
              },
              valid: false
            }
          }
        }
      };
    case 'forms/RESET_FORM':
      const formToReset = state.forms.forms[action.payload];
      const initialValues = action.meta?.initialValues || {};
      
      if (!formToReset) return state;
      
      return {
        ...state,
        forms: {
          ...state.forms,
          forms: {
            ...state.forms.forms,
            [action.payload]: {
              values: initialValues,
              touched: {},
              errors: {},
              dirty: false,
              submitting: false,
              submitted: false,
              valid: true
            }
          }
        }
      };
    default:
      return state;
  }
};

// Data Reducer
const dataReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'data/SET_LOADING':
      return {
        ...state,
        data: {
          ...state.data,
          loading: {
            ...state.data.loading,
            [action.payload.key]: action.payload.loading
          }
        }
      };
    case 'data/SET_ENTITIES':
      const { entityType, entities } = action.payload;
      const currentEntityState = state.data.entities[entityType] || { byId: {}, allIds: [] };
      
      // Handle both array of entities and single entity
      const entityMap = Array.isArray(entities)
        ? entities.reduce((acc, entity) => ({ ...acc, [entity.id]: entity }), {})
        : { [entities.id]: entities };
      
      const existingIds = new Set(currentEntityState.allIds);
      const newIds = Array.isArray(entities) 
        ? entities.map(e => e.id).filter(id => !existingIds.has(id))
        : existingIds.has(entities.id) ? [] : [entities.id];
      
      return {
        ...state,
        data: {
          ...state.data,
          entities: {
            ...state.data.entities,
            [entityType]: {
              byId: { ...currentEntityState.byId, ...entityMap },
              allIds: [...currentEntityState.allIds, ...newIds]
            }
          }
        }
      };
    case 'data/UPDATE_ENTITY':
      const { entityType: type, id, changes } = action.payload;
      const entity = state.data.entities[type]?.byId[id];
      
      if (!entity) return state;
      
      return {
        ...state,
        data: {
          ...state.data,
          entities: {
            ...state.data.entities,
            [type]: {
              ...state.data.entities[type],
              byId: {
                ...state.data.entities[type].byId,
                [id]: {
                  ...entity,
                  ...changes
                }
              }
            }
          }
        }
      };
    case 'data/REMOVE_ENTITY':
      const { entityType: entityTypeToRemove, id: idToRemove } = action.payload;
      const entityData = state.data.entities[entityTypeToRemove];
      
      if (!entityData) return state;
      
      const { [idToRemove]: _, ...remainingEntities } = entityData.byId;
      
      return {
        ...state,
        data: {
          ...state.data,
          entities: {
            ...state.data.entities,
            [entityTypeToRemove]: {
              byId: remainingEntities,
              allIds: entityData.allIds.filter(id => id !== idToRemove)
            }
          }
        }
      };
    case 'data/SET_CACHE':
      return {
        ...state,
        data: {
          ...state.data,
          cache: {
            ...state.data.cache,
            [action.payload.key]: {
              data: action.payload.data,
              timestamp: Date.now(),
              expiresAt: action.payload.expiresAt || Date.now() + (action.payload.ttl || 300000) // Default 5 minutes
            }
          }
        }
      };
    case 'data/CLEAR_CACHE':
      const { [action.payload]: cacheToRemove, ...remainingCache } = state.data.cache;
      
      return {
        ...state,
        data: {
          ...state.data,
          cache: remainingCache
        }
      };
    case 'data/CLEAR_ALL_CACHE':
      return {
        ...state,
        data: {
          ...state.data,
          cache: {}
        }
      };
    default:
      return state;
  }
};

// Auth Reducer
const authReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'auth/LOGIN_REQUEST':
      return {
        ...state,
        auth: {
          ...state.auth,
          loading: true,
          error: null
        }
      };
    case 'auth/LOGIN_SUCCESS':
      return {
        ...state,
        auth: {
          ...state.auth,
          user: action.payload.user,
          authenticated: true,
          token: action.payload.token,
          refreshToken: action.payload.refreshToken,
          expiresAt: action.payload.expiresAt,
          loading: false,
          error: null
        }
      };
    case 'auth/LOGIN_FAILURE':
      return {
        ...state,
        auth: {
          ...initialState.auth,
          loading: false,
          error: action.payload
        }
      };
    case 'auth/LOGOUT':
      return {
        ...state,
        auth: initialState.auth
      };
    case 'auth/UPDATE_USER':
      return {
        ...state,
        auth: {
          ...state.auth,
          user: {
            ...state.auth.user,
            ...action.payload
          }
        }
      };
    case 'auth/REFRESH_TOKEN_REQUEST':
      return {
        ...state,
        auth: {
          ...state.auth,
          loading: true
        }
      };
    case 'auth/REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        auth: {
          ...state.auth,
          token: action.payload.token,
          expiresAt: action.payload.expiresAt,
          loading: false
        }
      };
    case 'auth/REFRESH_TOKEN_FAILURE':
      return {
        ...state,
        auth: initialState.auth
      };
    default:
      return state;
  }
};

// Notifications Reducer
const notificationsReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'notifications/SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload.notifications
      };
    case 'notifications/ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: action.payload.id || Date.now().toString(),
            message: action.payload.message,
            type: action.payload.type || 'info',
            read: false,
            timestamp: action.payload.timestamp || Date.now()
          }
        ]
      };
    case 'notifications/MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => 
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      };
    case 'notifications/REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        )
      };
    default:
      return state;
  }
};

// Metrics Reducer
const metricsReducer = (state: AppState, action: StateAction): AppState => {
  switch (action.type) {
    case 'metrics/SET_COUNTS':
      return {
        ...state,
        metrics: {
          ...state.metrics,
          counts: action.payload.counts
        }
      };
    default:
      return state;
  }
};

// Main store reducer
export const mainReducer = (state: AppState = initialState, action: any): AppState => {
  // Apply each reducer sequentially
  state = uiReducer(state, action);
  state = formsReducer(state, action);
  state = dataReducer(state, action);
  state = authReducer(state, action);
  state = notificationsReducer(state, action);
  state = metricsReducer(state, action);
  return state;
};

// Create the state manager
const AppState = createStateManager<AppState>({
  initialState,
  reducers: [uiReducer, formsReducer, dataReducer, authReducer, notificationsReducer, metricsReducer],
  middleware: [
    createSubscriptionMiddleware<AppState>(),
    createThunkMiddleware<AppState>(),
    createDebounceMiddleware<AppState>(),
    createThrottleMiddleware<AppState>(),
    createLoggerMiddleware({
      collapsed: true,
      predicate: (_, action) => action.type.startsWith('ui/')
    })
  ],
  persist: {
    key: 'morpheo_app_state',
    include: ['ui', 'auth'],
    storage: typeof window !== 'undefined' ? localStorage : undefined
  }
});

// Export the provider and hooks
export const {
  StateContext: AppStateContext,
  StateProvider: AppStateProvider,
  useState: useAppState,
  useDispatch: useAppDispatch,
  useSelector: useAppSelector,
  useReducerEffect: useAppReducerEffect,
  useMiddlewareEffect: useAppMiddlewareEffect
} = AppState;

// Create a useStateValue function that returns only the state value for backward compatibility
export function useAppStateValue<TSelected>(
  selector?: (state: AppState) => TSelected
): TSelected {
  return useAppSelector(selector || (state => state as unknown as TSelected));
}

// Create action helpers
// UI Actions
export const toggleDarkMode = createAction('ui/TOGGLE_DARK_MODE');
export const setDarkMode = createAction<boolean>('ui/SET_DARK_MODE');
export const toggleSidebar = createAction('ui/TOGGLE_SIDEBAR');
export const setActiveModal = createAction<string | null>('ui/SET_ACTIVE_MODAL');
export const addNotification = createAction<Omit<Notification, 'read' | 'timestamp'> & { timestamp?: number }>('ui/ADD_NOTIFICATION');
export const markNotificationRead = createAction<string>('ui/MARK_NOTIFICATION_READ');
export const removeNotification = createAction<string>('ui/REMOVE_NOTIFICATION');
export const showToast = createAction<{ message: string, type?: 'info' | 'success' | 'warning' | 'error' }>('ui/SHOW_TOAST');
export const hideToast = createAction('ui/HIDE_TOAST');

// Forms Actions
export const initializeForm = createAction<{
  formId: string;
  initialValues?: Record<string, any>;
  validationRules?: FormValidationRules;
}>('forms/INITIALIZE_FORM');

export const setFormValue = createAction<{
  formId: string;
  field: string;
  value: any;
}>('forms/SET_FORM_VALUE');

export const setFormTouched = createAction<{
  formId: string;
  field: string;
}>('forms/SET_FORM_TOUCHED');

export const submitForm = createAction<string>('forms/SUBMIT_FORM');
export const submitFormSuccess = createAction<string>('forms/SUBMIT_FORM_SUCCESS');
export const submitFormError = createAction<{
  formId: string;
  errors: Record<string, string>;
}>('forms/SUBMIT_FORM_ERROR');

export const resetForm = createAction<string>('forms/RESET_FORM');

// Data Actions
export const setLoading = createAction<{
  key: string;
  loading: boolean;
}>('data/SET_LOADING');

export const setEntities = createAction<{
  entityType: string;
  entities: any[] | Record<string, any>;
}>('data/SET_ENTITIES');

export const updateEntity = createAction<{
  entityType: string;
  id: string;
  changes: any;
}>('data/UPDATE_ENTITY');

export const removeEntity = createAction<{
  entityType: string;
  id: string;
}>('data/REMOVE_ENTITY');

export const setCache = createAction<{
  key: string;
  data: any;
  ttl?: number; // Time to live in milliseconds
  expiresAt?: number;
}>('data/SET_CACHE');

export const clearCache = createAction<string>('data/CLEAR_CACHE');
export const clearAllCache = createAction('data/CLEAR_ALL_CACHE');

// Auth Actions
export const loginRequest = createAction('auth/LOGIN_REQUEST');
export const loginSuccess = createAction<{
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
  refreshToken: string;
  expiresAt: number;
}>('auth/LOGIN_SUCCESS');

export const loginFailure = createAction<string>('auth/LOGIN_FAILURE');
export const logout = createAction('auth/LOGOUT');
export const updateUser = createAction<Partial<AuthState['user']>>('auth/UPDATE_USER');

export const refreshTokenRequest = createAction('auth/REFRESH_TOKEN_REQUEST');
export const refreshTokenSuccess = createAction<{
  token: string;
  expiresAt: number;
}>('auth/REFRESH_TOKEN_SUCCESS');

export const refreshTokenFailure = createAction('auth/REFRESH_TOKEN_FAILURE');

// Selectors
// UI Selectors
export const selectDarkMode = (state: AppState) => state.ui.darkMode;
export const selectSidebarOpen = (state: AppState) => state.ui.sidebarOpen;
export const selectActiveModal = (state: AppState) => state.ui.activeModal;
export const selectNotifications = (state: AppState) => state.ui.notifications;
export const selectUnreadNotifications = (state: AppState) => 
  state.ui.notifications.filter(notification => !notification.read);
export const selectToast = (state: AppState) => state.ui.toast;

// Forms Selectors
export const selectForm = (formId: string) => (state: AppState) => 
  state.forms.forms[formId];
export const selectFormValues = (formId: string) => (state: AppState) => 
  state.forms.forms[formId]?.values || {};
export const selectFormErrors = (formId: string) => (state: AppState) => 
  state.forms.forms[formId]?.errors || {};
export const selectFormTouched = (formId: string) => (state: AppState) => 
  state.forms.forms[formId]?.touched || {};
export const selectFormValid = (formId: string) => (state: AppState) => 
  state.forms.forms[formId]?.valid || false;
export const selectFormSubmitting = (formId: string) => (state: AppState) => 
  state.forms.forms[formId]?.submitting || false;
export const selectFormSubmitted = (formId: string) => (state: AppState) => 
  state.forms.forms[formId]?.submitted || false;

// Data Selectors
export const selectLoading = (key: string) => (state: AppState) => 
  state.data.loading[key] || false;
export const selectAllEntities = (entityType: string) => (state: AppState) => 
  state.data.entities[entityType]?.byId || {};
export const selectEntitiesList = (entityType: string) => (state: AppState) => {
  const entities = state.data.entities[entityType];
  return entities ? entities.allIds.map(id => entities.byId[id]) : [];
};
export const selectEntityById = (entityType: string, id: string) => (state: AppState) => 
  state.data.entities[entityType]?.byId[id];
export const selectCache = (key: string) => (state: AppState) => {
  const cachedItem = state.data.cache[key];
  if (!cachedItem) return null;
  if (cachedItem.expiresAt < Date.now()) return null;
  return cachedItem.data;
};

// Auth Selectors
export const selectUser = (state: AppState) => state.auth.user;
export const selectIsAuthenticated = (state: AppState) => state.auth.authenticated;
export const selectAuthToken = (state: AppState) => state.auth.token;
export const selectAuthLoading = (state: AppState) => state.auth.loading;
export const selectAuthError = (state: AppState) => state.auth.error;

// Create a root provider to wrap the application
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AppStateProvider>
      {children}
    </AppStateProvider>
  );
};

export default AppProvider; 