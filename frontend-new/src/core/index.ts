// Export interfaces
export * from './ComponentInterface';

// Export core classes
export * from './ComponentRegistry';
export * from './ActionProcessor';
export * from './BaseComponent';
export * from './ComponentFactory';

// Export the selector function as the main API
export { selector as m } from './ComponentFactory'; 