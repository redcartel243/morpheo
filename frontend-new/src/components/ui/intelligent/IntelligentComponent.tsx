import React, { useEffect, useMemo, ReactNode } from 'react';
import { 
  ComponentId, 
  ComponentType, 
  ComponentInstance,
  ComponentEventType,
  Connection
} from './ComponentTypes';
import { useIntelligentComponent } from './useIntelligentComponent';
import { componentRegistry, renderComponent } from './ComponentRegistry';

/**
 * Props for the IntelligentComponent
 */
export interface IntelligentComponentProps {
  id: string;
  type?: ComponentType;
}

/**
 * A component that renders a component from the registry by ID
 */
export const IntelligentComponent: React.FC<IntelligentComponentProps> = ({ id, type }) => {
  const instance = componentRegistry.getInstance(id);
  
  if (!instance) {
    console.warn(`Component instance ${id} not found in the registry.`);
    return null;
  }
  
  const definition = componentRegistry.getComponent(instance.type);
  
  if (!definition) {
    console.warn(`Component definition for ${instance.type} not found in the registry.`);
    return null;
  }
  
  // Render the component using its renderer
  return definition.renderer(instance);
};

/**
 * Component to render a list of intelligent components
 */
export const ComponentRenderer: React.FC<{
  components: ComponentId[];
  containerProps?: Record<string, any>;
}> = ({ components, containerProps = {} }) => {
  return (
    <div {...containerProps}>
      {components.map(id => (
        <ComponentById key={id} id={id} />
      ))}
    </div>
  );
};

/**
 * Component to render a specific intelligent component by ID
 */
export const ComponentById = ({ id }: { id: ComponentId }): React.ReactElement | null => {
  const component = useMemo(() => {
    return renderComponent(id);
  }, [id]);
  
  // Return the component or null
  return component || null;
};

/**
 * Higher order component to create an intelligent component
 */
export function withIntelligentComponent<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  type: ComponentType,
  defaultProps?: Partial<P>
) {
  return function WithIntelligentComponent(props: P & { componentId?: ComponentId }) {
    const { componentId, ...componentProps } = props;
    
    console.log(`Initializing intelligent component with ID: ${componentId}, type: ${type}`);
    
    const {
      id,
      props: instanceProps,
      updateProps,
      sendEvent,
      getConnectionValue,
      connect,
      disconnect,
      connections
    } = useIntelligentComponent({
      type,
      id: componentId,
      initProps: { ...defaultProps, ...componentProps }
    });
    
    console.log(`Component instance created with ID: ${id}`, { 
      type,
      hasConnections: connections?.length > 0
    });
    
    // Send init event when component is mounted
    useEffect(() => {
      console.log(`Component ${id} mounted, sending INIT event`);
      sendEvent(ComponentEventType.INIT, 'init', {});
      
      return () => {
        console.log(`Component ${id} unmounted, sending DESTROY event`);
        sendEvent(ComponentEventType.DESTROY, 'destroy', {});
      };
    }, [sendEvent, id]);
    
    // Combine props with connection methods
    const enhancedProps = {
      ...componentProps,
      componentId: id,
      sendEvent,
      getConnectionValue,
      connect,
      disconnect,
      connections
    };
    
    return <WrappedComponent {...enhancedProps as unknown as P} />;
  };
} 