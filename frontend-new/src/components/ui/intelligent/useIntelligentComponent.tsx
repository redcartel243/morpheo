import React, { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ComponentId, 
  ComponentType,
  ConnectionPoint,
  ComponentEvent,
  ComponentEventType,
  Connection,
  ComponentInstance
} from './ComponentTypes';
import { componentRegistry } from './ComponentRegistry';
import { connectionManager } from './ConnectionManager';
import { useAppDispatch, useAppSelector } from '../state/Store';
import { SUBSCRIBE, UNSUBSCRIBE } from '../state/actionTypes';

/**
 * Props for the useIntelligentComponent hook
 */
interface UseIntelligentComponentProps {
  type: ComponentType;
  id?: ComponentId;
  initProps?: Record<string, any>;
}

/**
 * Result from the useIntelligentComponent hook
 */
interface UseIntelligentComponentResult {
  id: ComponentId;
  props: Record<string, any>;
  updateProps: (updates: Record<string, any>) => void;
  sendEvent: (eventType: ComponentEventType, connectionId: string, payload: any) => void;
  getConnectionValue: (connectionId: string) => any;
  connect: (
    sourceConnectionId: string,
    targetComponentId: ComponentId,
    targetConnectionId: string,
    transform?: (value: any) => any
  ) => Connection;
  disconnect: (connectionId: string) => boolean;
  connections: Connection[];
}

/**
 * Hook for intelligent components to interact with the connection system
 */
export function useIntelligentComponent({
  type,
  id: providedId,
  initProps = {}
}: UseIntelligentComponentProps): UseIntelligentComponentResult {
  // Generate or use the provided component ID
  const id = providedId || uuidv4();
  
  // Set up state management
  const dispatch = useAppDispatch();
  
  // State for component props
  const [props, setProps] = useState(initProps);
  
  // Register the component instance on mount
  useEffect(() => {
    // Create a new component instance if it doesn't exist
    if (!componentRegistry.getInstance(id)) {
      const newInstance: ComponentInstance = {
        id,
        type,
        properties: initProps,
        state: {}
      };
      
      // Register with the component registry
      componentRegistry.registerInstance(newInstance);
      
      // Dispatch initialization event
      dispatch({
        type: 'COMPONENT_INITIALIZED',
        payload: {
          id,
          componentType: type
        }
      });
    }
    
    // Cleanup on unmount
    return () => {
      componentRegistry.removeInstance(id);
      
      // Dispatch destroy event
      dispatch({
        type: 'components/COMPONENT_UNREGISTERED',
        payload: {
          id
        }
      });
    };
  }, [id, type, dispatch, initProps]);
  
  // Update component properties
  const updateProps = useCallback((updates: Record<string, any>, options = { dispatchUpdate: true }) => {
    setProps(prev => {
      const newProps = { ...prev, ...updates };
      
      // Update the registry
      componentRegistry.updateInstance(id, { 
        properties: newProps 
      });
      
      return newProps;
    });
    
    // Only dispatch update event if requested (default) but not when handling incoming connection data
    if (options.dispatchUpdate !== false) {
      dispatch({
        type: 'components/COMPONENT_UPDATED',
        payload: {
          id,
          updates
        }
      });
    }
  }, [id, dispatch]);
  
  // Send an event through a connection
  const sendEvent = useCallback((
    eventType: ComponentEventType,
    connectionId: string,
    payload: any,
    meta?: Record<string, any>
  ) => {
    const event: ComponentEvent = {
      type: eventType,
      componentId: id,
      connectionId,
      timestamp: Date.now(),
      payload,
      meta
    };
    
    // Also update this component's own state to reflect the change
    // This is important for bidirectional connections
    if (connectionId === 'value') {
      componentRegistry.updateInstance(id, {
        state: {
          value: payload
        }
      });
    }
    
    // Dispatch the event to the store
    dispatch({
      type: 'components/COMPONENT_EVENT',
      payload: event
    });
    
    // Find outgoing connections from this connection point
    const connections = connectionManager.getOutgoingConnections(id)
      .filter(conn => conn.sourceConnectionId === connectionId);
    
    // Forward the event to all connected components
    connections.forEach(connection => {
      const targetInstance = componentRegistry.getInstance(connection.targetComponentId);
      
      if (targetInstance) {
        // Apply transform function if provided
        const transformedPayload = connection.transform 
          ? connection.transform(payload) 
          : payload;
        
        // Update target component's state to reflect the new value
        componentRegistry.updateInstance(connection.targetComponentId, {
          state: {
            [connection.targetConnectionId]: transformedPayload
          }
        });
        
        // Dispatch an event for the target component
        dispatch({
          type: 'components/CONNECTION_DATA_RECEIVED',
          payload: {
            connectionId: connection.id,
            sourceComponentId: id,
            targetComponentId: connection.targetComponentId,
            sourceConnectionId: connectionId,
            targetConnectionId: connection.targetConnectionId,
            value: transformedPayload
          }
        });
      }
    });
  }, [id, dispatch]);
  
  // Listen for connection data received events targeting this component
  useEffect(() => {
    // Define the listener function
    const connectionDataListener = (action: any) => {
      // Only process CONNECTION_DATA_RECEIVED actions targeting this component
      if (
        action.type === 'components/CONNECTION_DATA_RECEIVED' && 
        action.payload?.targetComponentId === id
      ) {
        // Extract connection data
        const { targetConnectionId, value } = action.payload;
        
        // Update the component's state with the new value
        componentRegistry.updateInstance(id, {
          state: {
            [targetConnectionId]: value
          }
        });
        
        // If this is a value connection, also update the local state
        // but don't dispatch another event to avoid infinite loops
        if (targetConnectionId === 'value') {
          updateProps({ value }, { dispatchUpdate: false });
        }
      }
    };
    
    // Subscribe to the event
    const result: any = dispatch({
      type: SUBSCRIBE,
      payload: connectionDataListener
    });
    
    // Return cleanup function
    return () => {
      if (typeof result === 'function') {
        result();
      }
    };
  }, [id, dispatch, updateProps]);
  
  // Get the current value of a connection
  const getConnectionValue = useCallback((connectionId: string) => {
    const instance = componentRegistry.getInstance(id);
    return instance?.state?.[connectionId];
  }, [id]);
  
  // Connect to another component
  const connect = useCallback((
    sourceConnectionId: string,
    targetComponentId: ComponentId,
    targetConnectionId: string,
    transform?: (value: any) => any
  ): Connection => {
    const connectionId = connectionManager.connect(
      id,
      sourceConnectionId,
      targetComponentId,
      targetConnectionId,
      transform
    );
    
    // Get the created connection and return it
    return connectionManager.getAllConnections().find(conn => conn.id === connectionId)!;
  }, [id]);
  
  // Disconnect a connection
  const disconnect = useCallback((connectionId: string) => {
    return connectionManager.removeConnection(connectionId);
  }, []);
  
  // Get all connections for this component
  const connections = useAppSelector(state => {
    // Use a selector to get connections from state if available
    // or fall back to the connection manager directly
    return connectionManager.getConnectionsForComponent(id);
  });
  
  return {
    id,
    props,
    updateProps,
    sendEvent,
    getConnectionValue,
    connect,
    disconnect,
    connections
  };
}

/**
 * Hook to listen for events from a specific component or connection
 */
export function useComponentEvents(
  componentId?: ComponentId, 
  connectionId?: string,
  eventType?: ComponentEventType
) {
  // Select events from the store based on filters
  return useAppSelector(state => {
    // Here we would filter component events from the state
    // This is a placeholder for now and would integrate with the redux state
    return [];
  });
}

/**
 * Hook to get the current value of a specific connection
 */
export function useConnectionValue(componentId: ComponentId, connectionId: string) {
  return useAppSelector(state => {
    const instance = componentRegistry.getInstance(componentId);
    return instance?.state?.[connectionId];
  });
} 