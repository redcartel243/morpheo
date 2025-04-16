/**
 * Core types for the Morpheo Intelligent Component System
 */

import React, { ReactNode } from 'react';
import { StyleProps } from '../components/types';

/**
 * Component type identifiers
 */
export enum ComponentType {
  BUTTON = 'button',
  TEXT_INPUT = 'text-input',
  TEXT = 'text',
  CONTAINER = 'container',
  GRID = 'grid',
  CARD = 'card',
  IMAGE = 'image',
  ICON = 'icon',
  TOGGLE = 'toggle',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  SELECT = 'select',
  SLIDER = 'slider',
  PROGRESS = 'progress',
  TABLE = 'table',
  CHART = 'chart',
  MAP = 'map',
  TEXTAREA = 'textarea',
  DIVIDER = 'divider',
  BADGE = 'badge',
  ALERT = 'alert',
  TAB = 'tab',
  TABS = 'tabs',
  ACCORDION = 'accordion',
  MENU = 'menu',
  TOOLTIP = 'tooltip',
  DIALOG = 'dialog',
  DRAWER = 'drawer',
  APPBAR = 'appbar',
  FORM = 'form',
  DATETIME = 'datetime',
  COLOR_PICKER = 'color-picker',
  FILE_UPLOAD = 'file-upload',
  AVATAR = 'avatar',
  CHIP = 'chip',
  LIST = 'list',
  LIST_ITEM = 'list-item',
  PAGINATION = 'pagination',
  STEPPER = 'stepper',
  BREADCRUMB = 'breadcrumb',
  RATING = 'rating',
  SKELETON = 'skeleton',
  BACKDROP = 'backdrop',
  SPEED_DIAL = 'speed-dial',
  TREE_VIEW = 'tree-view',
  TRANSFER_LIST = 'transfer-list',
  MASONRY = 'masonry',
  LAYOUT = 'layout',
  RESPONSIVE = 'responsive'
}

/**
 * Component ID type
 */
export type ComponentId = string;

/**
 * Connection ID type
 */
export type ConnectionId = string;

/**
 * Direction of data flow for a connection point
 */
export type ConnectionDirection = 'input' | 'output' | 'bidirectional';

/**
 * Data types for connections
 */
export enum DataType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  OBJECT = 'object',
  ARRAY = 'array',
  ANY = 'any'
}

/**
 * Connection point definition
 */
export interface ConnectionPoint {
  id: string;
  name: string;
  description: string;
  type: DataType;
  direction: ConnectionDirection;
  defaultValue?: any;
  metadata?: Record<string, any>;
}

/**
 * Component capability definition
 */
export interface ComponentCapability {
  id: string;
  name: string;
  description: string;
  connectionPoints: ConnectionPoint[];
  metadata?: Record<string, any>;
}

/**
 * Connection between components
 */
export interface Connection {
  id: ConnectionId;
  sourceComponentId: ComponentId;
  sourceConnectionId: string;
  targetComponentId: ComponentId;
  targetConnectionId: string;
  transform?: (value: any) => any;
  metadata?: Record<string, any>;
}

/**
 * Component event types
 */
export enum ComponentEventType {
  INIT = 'init',
  DESTROY = 'destroy',
  UPDATE = 'update',
  CLICK = 'click',
  FOCUS = 'focus',
  BLUR = 'blur',
  CHANGE = 'change',
  INPUT = 'input',
  SUBMIT = 'submit',
  HOVER = 'hover',
  DRAG = 'drag',
  DROP = 'drop',
  RESIZE = 'resize',
  USER_INTERACTION = 'user_interaction',
  CONNECTION = 'connection',
  CUSTOM = 'custom',
  STATE_CHANGE = 'state_change',
  VALUE_CHANGE = 'value_change'
}

/**
 * Component event
 */
export interface ComponentEvent {
  type: ComponentEventType;
  componentId: ComponentId;
  connectionId: string;
  timestamp: number;
  payload: any;
  meta?: Record<string, any>;
}

/**
 * Component metadata
 */
export interface ComponentMeta {
  type: ComponentType;
  name: string;
  description: string;
  capabilities: ComponentCapability[];
  defaultProps?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Basic component instance interface
 */
export interface ComponentInstance {
  id: ComponentId;
  type: ComponentType;
  properties: Record<string, any>;
  meta?: Record<string, any>;
  state?: Record<string, any>;
  
  // Parent-child relationships
  parent?: ComponentId;
  children?: ComponentId[];
  
  // Event emission
  emit?: (connectionId: string, payload: any) => void;
}

/**
 * Component definition
 */
export interface ComponentDefinition {
  meta: ComponentMeta;
  initializer: (props: Record<string, any>) => ComponentInstance;
  renderer: (instance: ComponentInstance) => React.ReactElement | null;
  handlers?: Record<string, (event: any) => void>;
  utilities?: Record<string, (...args: any[]) => any>;
}

/**
 * Component Registry interface
 */
export interface ComponentRegistry {
  registerComponent(component: ComponentDefinition): void;
  getComponent(type: ComponentType): ComponentDefinition | undefined;
  registerInstance(instance: ComponentInstance): void;
  updateInstance(id: ComponentId, updates: Partial<ComponentInstance>): ComponentInstance | undefined;
  getInstance(id: ComponentId): ComponentInstance | undefined;
  removeInstance(id: ComponentId): boolean;
  getAllInstances(): ComponentInstance[];
}

/**
 * Connection Manager interface
 */
export interface ConnectionManager {
  connect(
    sourceComponentId: ComponentId,
    sourceConnectionId: string,
    targetComponentId: ComponentId,
    targetConnectionId: string,
    transform?: (value: any) => any
  ): ConnectionId;
  
  removeConnection(connectionId: ConnectionId): boolean;
  
  getConnectionsForComponent(componentId: ComponentId): Connection[];
  
  getOutgoingConnections(componentId: ComponentId): Connection[];
  
  getIncomingConnections(componentId: ComponentId): Connection[];
  
  createConnection(params: {
    sourceComponentId: ComponentId;
    sourceConnectionId: string;
    targetComponentId: ComponentId;
    targetConnectionId: string;
    transform?: (value: any) => any;
  }): ConnectionId;
  
  createAIConnections(componentIds: ComponentId[]): ConnectionId[];
  
  getAllConnections(): Connection[];
}

/**
 * Style properties for component customization
 */
export type ComponentStyleProps = StyleProps & {
  customClasses?: string[];
  themeVariant?: 'light' | 'dark' | 'system';
  animation?: {
    type: 'fade' | 'slide' | 'scale' | 'custom';
    duration: number;
    delay?: number;
    easing?: string;
    custom?: string;
  };
  responsive?: {
    mobile?: Partial<StyleProps>;
    tablet?: Partial<StyleProps>;
    desktop?: Partial<StyleProps>;
  };
}; 