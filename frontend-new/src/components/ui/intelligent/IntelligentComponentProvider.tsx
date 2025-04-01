import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { componentReducer } from './ComponentReducer';
import { componentRegistry } from './ComponentRegistry';
import { ComponentType } from './ComponentTypes';

// Import component definitions directly to ensure they're registered
import '../intelligent/components/Button';
import '../intelligent/components/TextInput';

// Context for the intelligent component system
const IntelligentComponentContext = createContext<{ initialized: boolean }>({
  initialized: false
});

// Hook to use the intelligent component context
export const useIntelligentComponentSystem = () => useContext(IntelligentComponentContext);

interface IntelligentComponentProviderProps {
  children: ReactNode;
}

/**
 * Provider for the intelligent component system
 * This ensures components are properly registered
 */
export const IntelligentComponentProvider: React.FC<IntelligentComponentProviderProps> = ({
  children
}) => {
  // Verify component registration
  useEffect(() => {
    // Check if components are registered
    const buttonDef = componentRegistry.getComponent(ComponentType.BUTTON);
    const textInputDef = componentRegistry.getComponent(ComponentType.TEXT_INPUT);
    
    console.log('Component registry status on provider mount:', {
      buttonRegistered: !!buttonDef,
      textInputRegistered: !!textInputDef
    });
    
    if (!buttonDef) {
      console.error('Button component is not registered in the registry');
      // Force import the Button component to register it
      require('../intelligent/components/Button');
    }
    
    if (!textInputDef) {
      console.error('TextInput component is not registered in the registry');
      // Force import the TextInput component to register it
      require('../intelligent/components/TextInput');
    }
    
    console.log('Intelligent components system initialized');
  }, []);
  
  return (
    <IntelligentComponentContext.Provider value={{ initialized: true }}>
      {children}
    </IntelligentComponentContext.Provider>
  );
};

/**
 * Higher order component to wrap a component with the intelligent component provider
 */
export const withIntelligentComponentProvider = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return function WithIntelligentComponentProvider(props: P) {
    return (
      <IntelligentComponentProvider>
        <Component {...props} />
      </IntelligentComponentProvider>
    );
  };
};

export default IntelligentComponentProvider; 