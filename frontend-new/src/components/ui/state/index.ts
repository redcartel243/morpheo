// Export from StateManager
export {
  createStateManager,
  createStateContext,
  createAction,
  createLoggerMiddleware,
  createDerivedState,
  composeState,
  type StateAction,
  type StateReducer,
  type StateSelector,
  type Middleware
} from './StateManager';

// Export from Store
export {
  AppProvider,
  useAppState,
  useAppStateValue,
  useAppDispatch,
  useAppSelector,
  useAppReducerEffect,
  // UI Actions
  toggleDarkMode,
  setDarkMode,
  toggleSidebar,
  setActiveModal,
  addNotification,
  markNotificationRead,
  removeNotification,
  showToast,
  hideToast,
  // Forms Actions
  initializeForm,
  setFormValue,
  setFormTouched,
  submitForm,
  submitFormSuccess,
  submitFormError,
  resetForm,
  // Data Actions
  setLoading,
  setEntities,
  updateEntity,
  removeEntity,
  setCache,
  clearCache,
  clearAllCache,
  // Auth Actions
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  refreshTokenRequest,
  refreshTokenSuccess,
  refreshTokenFailure,
  // UI Selectors
  selectDarkMode,
  selectSidebarOpen,
  selectActiveModal,
  selectNotifications,
  selectUnreadNotifications,
  selectToast,
  // Forms Selectors
  selectForm,
  selectFormValues,
  selectFormErrors,
  selectFormTouched,
  selectFormValid,
  selectFormSubmitting,
  selectFormSubmitted,
  // Data Selectors
  selectLoading,
  selectAllEntities,
  selectEntitiesList,
  selectEntityById,
  selectCache,
  // Auth Selectors
  selectUser,
  selectIsAuthenticated,
  selectAuthToken,
  selectAuthLoading,
  selectAuthError,
  // Types
  type AppState,
  type UIState,
  type FormsState,
  type DataState,
  type AuthState,
  type Notification,
  type FormState,
  type FormValidationRules
} from './Store';

// Export from DerivedState
export {
  selectPrioritizedTasks,
  selectIncompleteTasksCount,
  selectTasksStats,
  selectFilteredTasks,
  useDerivedTasksState,
  useComposedThemeAndTaskState
} from './DerivedState';

// Export from middleware
export {
  createThunkMiddleware,
  createApiMiddleware,
  createDebounceMiddleware,
  createThrottleMiddleware,
  createValidationMiddleware,
  createBatchActionsMiddleware,
  createLocalStorageMiddleware,
  combineMiddleware
} from './middleware'; 