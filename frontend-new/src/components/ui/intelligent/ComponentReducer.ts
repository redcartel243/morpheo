import { 
  ComponentId, 
  ComponentType, 
  ComponentEvent,
  Connection 
} from './ComponentTypes';

// Define the state shape for intelligent components
export interface IntelligentComponentState {
  instances: Record<ComponentId, {
    id: ComponentId;
    type: ComponentType;
    props: Record<string, any>;
    state: Record<string, any>;
  }>;
  connections: Record<string, Connection>;
  events: ComponentEvent[];
  lastEventTimestamp: number | null;
}

// Initial state
const initialState: IntelligentComponentState = {
  instances: {},
  connections: {},
  events: [],
  lastEventTimestamp: null
};

// Action types
export const COMPONENT_REGISTERED = 'components/COMPONENT_REGISTERED';
export const COMPONENT_UNREGISTERED = 'components/COMPONENT_UNREGISTERED';
export const COMPONENT_UPDATED = 'components/COMPONENT_UPDATED';
export const COMPONENT_EVENT = 'components/COMPONENT_EVENT';
export const CONNECTION_CREATED = 'components/CONNECTION_CREATED';
export const CONNECTION_REMOVED = 'components/CONNECTION_REMOVED';
export const CONNECTION_DATA_RECEIVED = 'components/CONNECTION_DATA_RECEIVED';

// Reducer
export function componentReducer(
  state: IntelligentComponentState = initialState,
  action: any
): IntelligentComponentState {
  switch (action.type) {
    case COMPONENT_REGISTERED:
      return {
        ...state,
        instances: {
          ...state.instances,
          [action.payload.id]: {
            id: action.payload.id,
            type: action.payload.componentType,
            props: action.payload.props || {},
            state: {}
          }
        }
      };

    case COMPONENT_UNREGISTERED:
      // Create a new instances object without the removed component
      const { [action.payload.id]: removedInstance, ...remainingInstances } = state.instances;
      
      // Remove connections involving this component
      const updatedConnections = { ...state.connections };
      Object.keys(updatedConnections).forEach(connId => {
        const conn = updatedConnections[connId];
        if (
          conn.sourceComponentId === action.payload.id || 
          conn.targetComponentId === action.payload.id
        ) {
          delete updatedConnections[connId];
        }
      });

      return {
        ...state,
        instances: remainingInstances,
        connections: updatedConnections
      };

    case COMPONENT_UPDATED:
      return {
        ...state,
        instances: {
          ...state.instances,
          [action.payload.id]: {
            ...state.instances[action.payload.id],
            props: {
              ...state.instances[action.payload.id]?.props,
              ...action.payload.updates
            }
          }
        }
      };

    case COMPONENT_EVENT:
      const event = action.payload as ComponentEvent;

      return {
        ...state,
        events: [
          ...state.events.slice(-99), // Keep last 100 events
          event
        ],
        lastEventTimestamp: event.timestamp
      };

    case CONNECTION_CREATED:
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.id]: action.payload
        }
      };

    case CONNECTION_REMOVED:
      // Create a new connections object without the removed connection
      const { [action.payload.id]: removedConnection, ...remainingConnections } = state.connections;
      
      return {
        ...state,
        connections: remainingConnections
      };

    case CONNECTION_DATA_RECEIVED:
      return {
        ...state,
        instances: {
          ...state.instances,
          [action.payload.targetComponentId]: {
            ...state.instances[action.payload.targetComponentId],
            state: {
              ...state.instances[action.payload.targetComponentId]?.state,
              [action.payload.targetConnectionId]: action.payload.value
            }
          }
        }
      };

    default:
      return state;
  }
}

// Action creators
export const registerComponent = (
  id: ComponentId, 
  componentType: ComponentType, 
  props?: Record<string, any>
) => ({
  type: COMPONENT_REGISTERED,
  payload: { id, componentType, props }
});

export const unregisterComponent = (id: ComponentId) => ({
  type: COMPONENT_UNREGISTERED,
  payload: { id }
});

export const updateComponent = (id: ComponentId, updates: Record<string, any>) => ({
  type: COMPONENT_UPDATED,
  payload: { id, updates }
});

export const dispatchComponentEvent = (event: ComponentEvent) => ({
  type: COMPONENT_EVENT,
  payload: event
});

export const createConnection = (connection: Connection) => ({
  type: CONNECTION_CREATED,
  payload: connection
});

export const removeConnection = (connectionId: string) => ({
  type: CONNECTION_REMOVED,
  payload: { id: connectionId }
});

export const receiveConnectionData = (
  connectionId: string,
  sourceComponentId: ComponentId,
  targetComponentId: ComponentId,
  sourceConnectionId: string,
  targetConnectionId: string,
  value: any
) => ({
  type: CONNECTION_DATA_RECEIVED,
  payload: {
    connectionId,
    sourceComponentId,
    targetComponentId,
    sourceConnectionId,
    targetConnectionId,
    value
  }
}); 