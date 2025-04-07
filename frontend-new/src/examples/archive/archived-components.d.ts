// Type declarations for archived components
// This file exists only to silence TypeScript errors in archived demo files

declare module '../components/ui/state/Store' {
  export const useAppDispatch: () => any;
  export const useAppSelector: (selector: (state: any) => any) => any;
  export const useAppState: () => any;
  export const useAppStateValue: (selector: (state: any) => any) => any;
  export const AppProvider: React.FC<any>;
  export const initializeForm: (config: any) => any;
  export const setFormValue: (config: any) => any;
  export const submitForm: (formId: string) => any;
  export const submitFormSuccess: (formId: string) => any;
  export const addNotification: (notification: any) => any;
  export const setEntities: (config: any) => any;
  export const toggleDarkMode: () => any;
  export const showToast: (config: any) => any;
  export const selectDarkMode: (state: any) => boolean;
  export const selectForm: (formId: string) => (state: any) => any;
  export const selectFormValues: (formId: string) => (state: any) => any;
}

declare module '../components/ui/state/DerivedState' {
  export const useDerivedTasksState: (formId: string) => any;
  export const useComposedThemeAndTaskState: (formId: string) => any;
  export const selectFilteredTasks: (state: any) => any[];
  export const selectTasksStats: (state: any) => any;
}

declare module '../components/ui/components/layout/Card' {
  const Card: React.FC<any>;
  export default Card;
}

declare module '../components/ui/components/layout/Grid' {
  const Grid: React.FC<any>;
  export default Grid;
}

declare module '../components/ui/components/basic/Text' {
  const Text: React.FC<any>;
  export default Text;
}

declare module '../components/ui/intelligent/components' {
  export const IntelligentButton: React.FC<any>;
  export const IntelligentTextInput: React.FC<any>;
}

declare module '../components/ui/intelligent/ConnectionManager' {
  export const connectionManager: {
    connect: (sourceId: string, sourceProperty: string, targetId: string, targetProperty: string, transform?: (value: any) => any) => void;
    getConnectionsForComponent: (componentId: string) => any[];
    removeConnection: (connectionId: string) => void;
  };
}

declare module '../components/ui/intelligent/ComponentTypes' {
  export enum ComponentEventType {
    CLICK = 'click',
    CHANGE = 'change',
    INPUT = 'input',
    SUBMIT = 'submit'
  }
}

declare module '../components/ui/intelligent/IntelligentComponentProvider' {
  export const withIntelligentComponentProvider: (Component: React.ComponentType<any>) => React.FC<any>;
}

declare module '../components/ui/state/actionTypes' {
  export const SUBSCRIBE: string;
}

declare module '../components/ui/intelligent/ComponentRegistry' {
  export const componentRegistry: {
    getInstance: (id: string) => any;
  };
} 