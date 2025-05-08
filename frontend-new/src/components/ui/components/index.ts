/**
 * Morpheo Component Library Index
 * 
 * This file exports components that can be used throughout the application.
 */

// Re-export theme (kept from original)
export * from '../theme/theme';
export { default as ThemeProvider, useTheme } from '../theme/ThemeProvider';
export * from '../theme/styled';

// Add more factory functions as needed 

// Export components from basic directory
import Text from './basic/Text';
import TextInput from './basic/TextInput';
import Select from './basic/Select';
import Canvas from './basic/Canvas';
import Video from './basic/Video';

// Export visualization components
import { Chart, DataTable, Map } from './visualization';

// Export components
export {
  Text,
  TextInput,
  Select,
  Canvas,
  Chart, 
  DataTable,
  Map,
  Video
}; 