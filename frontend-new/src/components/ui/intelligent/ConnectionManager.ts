import { v4 as uuidv4 } from 'uuid';
import { 
  Connection, 
  ConnectionManager, 
  ComponentId,
  ConnectionPoint,
  DataType,
  ComponentType
} from './ComponentTypes';
import { componentRegistry } from './ComponentRegistry';

// Re-export the Connection type
export type { Connection } from './ComponentTypes';

/**
 * Connection Manager
 * 
 * Manages connections between intelligent components by:
 * 1. Creating connections between component connection points
 * 2. Validating connection compatibility
 * 3. Transforming data between connections as needed
 * 4. Tracking and retrieving active connections
 */
class ConnectionManagerImpl implements ConnectionManager {
  private connections: Record<string, Connection> = {};
  private componentConnections: Record<string, string[]> = {};
  private static instance: ConnectionManagerImpl;
  private typeCompatibilityRules: Map<DataType, Set<DataType>> = new Map();

  private constructor() {
    this.initializeTypeCompatibilityRules();
  }

  /**
   * Get the singleton instance of the connection manager
   */
  public static getInstance(): ConnectionManagerImpl {
    if (!ConnectionManagerImpl.instance) {
      ConnectionManagerImpl.instance = new ConnectionManagerImpl();
    }
    return ConnectionManagerImpl.instance;
  }

  private initializeTypeCompatibilityRules() {
    // Initialize all types as compatible with themselves
    Object.values(DataType).forEach(type => {
      this.typeCompatibilityRules.set(type, new Set([type]));
    });

    // Add base compatibility rules
    this.addTypeCompatibility(DataType.NUMBER, DataType.TEXT);
    this.addTypeCompatibility(DataType.BOOLEAN, DataType.TEXT);
    this.addTypeCompatibility(DataType.TEXT, DataType.OBJECT);
    
    // OBJECT type is special - it can potentially be compatible with any type
    // This will be checked at runtime
    Object.values(DataType).forEach(type => {
      if (type !== DataType.OBJECT) {
        this.addTypeCompatibility(DataType.OBJECT, type);
      }
    });
  }

  private addTypeCompatibility(sourceType: DataType, targetType: DataType) {
    const compatibleTypes = this.typeCompatibilityRules.get(sourceType) || new Set();
    compatibleTypes.add(targetType);
    this.typeCompatibilityRules.set(sourceType, compatibleTypes);
  }

  /**
   * Connect two components
   */
  connect(
    sourceComponentId: string,
    sourceConnectionId: string,
    targetComponentId: string,
    targetConnectionId: string,
    transform?: (value: any) => any
  ): string {
    const id = uuidv4();
    
    const connection: Connection = {
      id,
      sourceComponentId,
      sourceConnectionId,
      targetComponentId,
      targetConnectionId,
      transform
    };
    
    this.connections[id] = connection;
    
    // Track connections by component
    this.addComponentConnection(sourceComponentId, id);
    this.addComponentConnection(targetComponentId, id);
    
    return id;
  }

  /**
   * Add a connection to component tracking
   */
  private addComponentConnection(componentId: string, connectionId: string): void {
    if (!this.componentConnections[componentId]) {
      this.componentConnections[componentId] = [];
    }
    this.componentConnections[componentId].push(connectionId);
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): boolean {
    const connection = this.connections[connectionId];
    if (!connection) return false;
    
    // Remove from component tracking
    this.removeComponentConnection(connection.sourceComponentId, connectionId);
    this.removeComponentConnection(connection.targetComponentId, connectionId);
    
    // Remove the connection
    delete this.connections[connectionId];
    
    return true;
  }

  /**
   * Remove connection from component tracking
   */
  private removeComponentConnection(componentId: string, connectionId: string): void {
    if (!this.componentConnections[componentId]) return;
    
    this.componentConnections[componentId] = this.componentConnections[componentId]
      .filter(id => id !== connectionId);
    
    // Remove the array if empty
    if (this.componentConnections[componentId].length === 0) {
      delete this.componentConnections[componentId];
    }
  }

  /**
   * Get all connections for a component
   */
  getConnectionsForComponent(componentId: string): Connection[] {
    if (!this.componentConnections[componentId]) return [];
    
    return this.componentConnections[componentId]
      .map(id => this.connections[id])
      .filter(Boolean);
  }

  /**
   * Create a connection between components
   * Backward compatibility with older code
   */
  createConnection(params: {
    sourceComponentId: string;
    sourceConnectionId: string;
    targetComponentId: string;
    targetConnectionId: string;
    transform?: (value: any) => any;
  }): string {
    return this.connect(
      params.sourceComponentId,
      params.sourceConnectionId,
      params.targetComponentId,
      params.targetConnectionId,
      params.transform
    );
  }

  /**
   * Create connections using AI matching logic
   * This method analyzes components and automatically creates appropriate connections
   */
  createAIConnections(componentIds: ComponentId[]): string[] {
    const createdConnections: string[] = [];
    const processedComponents = new Set<ComponentId>();
    
    // For each component
    for (const sourceId of componentIds) {
      if (processedComponents.has(sourceId)) continue;
      
      const sourceInstance = componentRegistry.getInstance(sourceId);
      if (!sourceInstance) continue;
      
      const sourceDef = componentRegistry.getComponent(sourceInstance.type);
      if (!sourceDef) continue;
      
      // Get output connection points from this component
      const outputPoints = this.getAllConnectionPoints(sourceInstance.type)
        .filter(point => point.direction === 'output' || point.direction === 'bidirectional');
      
      // For each potential target component
      for (const targetId of componentIds) {
        if (sourceId === targetId) continue; // Skip self-connections
        
        const targetInstance = componentRegistry.getInstance(targetId);
        if (!targetInstance) continue;
        
        const targetDef = componentRegistry.getComponent(targetInstance.type);
        if (!targetDef) continue;
        
        // Get input connection points from potential target
        const inputPoints = this.getAllConnectionPoints(targetInstance.type)
          .filter(point => point.direction === 'input' || point.direction === 'bidirectional');
        
        // For each pair of connection points, check if they are compatible
        for (const sourcePoint of outputPoints) {
          for (const targetPoint of inputPoints) {
            // Check semantic compatibility based on name, description, and type
            if (this.checkAICompatibility(sourcePoint, targetPoint)) {
              try {
                const connectionId = this.connect(
                  sourceId,
                  sourcePoint.id,
                  targetId,
                  targetPoint.id
                );
                createdConnections.push(connectionId);
                console.log(`AI created connection: ${sourceId}:${sourcePoint.id} → ${targetId}:${targetPoint.id}`);
              } catch (e) {
                console.warn(`AI connection creation failed: ${e}`);
              }
            }
          }
        }
      }
      
      processedComponents.add(sourceId);
    }
    
    return createdConnections;
  }
  
  /**
   * Check if two connection points are semantically compatible according to AI rules
   */
  private checkAICompatibility(source: ConnectionPoint, target: ConnectionPoint): boolean {
    // First, check basic type compatibility
    if (!this.areTypesCompatible(source.type, target.type)) {
      return false;
    }
    
    // Then check semantic compatibility using names and descriptions
    
    // 1. Direct name matches (e.g., "output" -> "input")
    const sourceNameLower = source.name.toLowerCase();
    const targetNameLower = target.name.toLowerCase();
    
    // Common output/input pairs
    if (
      (sourceNameLower.includes('output') && targetNameLower.includes('input')) ||
      (sourceNameLower.includes('result') && targetNameLower.includes('value')) ||
      (sourceNameLower.includes('click') && targetNameLower.includes('trigger')) ||
      (sourceNameLower.includes('data') && targetNameLower.includes('data')) ||
      (sourceNameLower.includes('value') && targetNameLower.includes('value'))
    ) {
      return true;
    }
    
    // 2. Calculator specific connections (e.g., number input -> display)
    if (
      (sourceNameLower.includes('number') && targetNameLower.includes('display')) ||
      (sourceNameLower.includes('digit') && targetNameLower.includes('display')) ||
      (sourceNameLower.includes('operator') && targetNameLower.includes('operation')) ||
      (sourceNameLower.includes('result') && targetNameLower.includes('display')) ||
      (sourceNameLower.includes('equals') && targetNameLower.includes('calculate'))
    ) {
      return true;
    }
    
    // 3. Description based matches
    const sourceDescLower = source.description.toLowerCase();
    const targetDescLower = target.description.toLowerCase();
    
    const sourceKeywords = this.extractKeywords(sourceDescLower);
    const targetKeywords = this.extractKeywords(targetDescLower);
    
    // Check for keyword overlap
    const overlap = sourceKeywords.filter(keyword => targetKeywords.includes(keyword));
    if (overlap.length > 0) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Extract meaningful keywords from a description
   */
  private extractKeywords(text: string): string[] {
    // Split by common separators and filter out common words
    const commonWords = new Set([
      'a', 'an', 'the', 'this', 'that', 'these', 'those', 
      'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'to', 'for', 'with', 'by', 'at', 'from', 'in', 'of', 'on'
    ]);
    
    return text
      .split(/[\s,.;:!?()[\]{}'"\/\\-]+/)
      .filter(word => word.length > 2) // Filter out very short words
      .filter(word => !commonWords.has(word))
      .map(word => word.toLowerCase());
  }

  /**
   * Get all connection points for a component type
   */
  getAllConnectionPoints(componentType: ComponentType): ConnectionPoint[] {
    const definition = componentRegistry.getComponent(componentType);
    if (!definition) return [];
    
    return definition.meta.capabilities
      .flatMap(capability => capability.connectionPoints || []);
  }

  /**
   * Check if component connection points are compatible
   */
  private validateConnection(
    sourceComponentId: ComponentId,
    sourceConnectionId: string,
    targetComponentId: ComponentId,
    targetConnectionId: string
  ): boolean {
    // Get the component instances
    const sourceInstance = componentRegistry.getInstance(sourceComponentId);
    const targetInstance = componentRegistry.getInstance(targetComponentId);

    if (!sourceInstance || !targetInstance) {
      console.error('Component instance not found');
      return false;
    }

    // Get the component definitions
    const sourceDef = componentRegistry.getComponent(sourceInstance.type);
    const targetDef = componentRegistry.getComponent(targetInstance.type);

    if (!sourceDef || !targetDef) {
      console.error('Component definition not found');
      return false;
    }

    // Find the connection points
    const sourcePoint = this.findConnectionPoint(sourceDef.meta.capabilities, sourceConnectionId);
    const targetPoint = this.findConnectionPoint(targetDef.meta.capabilities, targetConnectionId);

    if (!sourcePoint || !targetPoint) {
      console.error('Connection point not found');
      return false;
    }

    // Check direction compatibility
    if (
      (sourcePoint.direction !== 'output' && sourcePoint.direction !== 'bidirectional') ||
      (targetPoint.direction !== 'input' && targetPoint.direction !== 'bidirectional')
    ) {
      console.error('Connection direction mismatch');
      return false;
    }

    // Check type compatibility
    if (!this.areTypesCompatible(sourcePoint.type, targetPoint.type)) {
      console.error('Connection type mismatch');
      return false;
    }

    return true;
  }

  /**
   * Find connection point in capabilities
   */
  private findConnectionPoint(capabilities: any[], connectionId: string): ConnectionPoint | null {
    for (const capability of capabilities) {
      if (!capability.connectionPoints) continue;
      
      const point = capability.connectionPoints.find((p: any) => p.id === connectionId);
      if (point) return point;
    }
    
    return null;
  }

  /**
   * Check if two data types are compatible
   */
  private areTypesCompatible(sourceType: DataType, targetType: DataType): boolean {
    const compatibleTypes = this.typeCompatibilityRules.get(sourceType);
    return compatibleTypes ? compatibleTypes.has(targetType) : false;
  }

  /**
   * Get all connections
   */
  getAllConnections(): Connection[] {
    return Object.values(this.connections);
  }

  /**
   * Get outgoing connections from a component
   */
  getOutgoingConnections(componentId: ComponentId): Connection[] {
    return this.getAllConnections()
      .filter(connection => connection.sourceComponentId === componentId);
  }

  /**
   * Get incoming connections to a component
   */
  getIncomingConnections(componentId: ComponentId): Connection[] {
    return this.getAllConnections()
      .filter(connection => connection.targetComponentId === componentId);
  }

  /**
   * Transform a value according to a connection's transform function
   */
  transformValue(connection: Connection, value: any): any {
    if (!connection.transform) return value;
    
    try {
      return connection.transform(value);
    } catch (error) {
      console.error('Error transforming value:', error);
      return value;
    }
  }
}

/**
 * Export the singleton instance
 */
export const connectionManager = ConnectionManagerImpl.getInstance();

// Add to window for debugging and external access
if (typeof window !== 'undefined') {
  window.intelligentComponentSystem = {
    ...window.intelligentComponentSystem,
    connectionManager
  };
}

// Export the class for testing and type information
export default ConnectionManagerImpl; 