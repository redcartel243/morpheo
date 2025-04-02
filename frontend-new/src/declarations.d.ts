// This file contains special TypeScript declarations
declare module '*.jpg';
declare module '*.png';
declare module '*.svg';
declare module '*.json' {
  const value: any;
  export default value;
} 