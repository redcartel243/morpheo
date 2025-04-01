import { UIConfig } from '../store/slices/uiSlice';
import { AppRequirements } from '../components/generator/AppRequirementsForm';
import { generateUIWithOpenAI, generateUIWithSmartGeneration } from './openaiService';

/**
 * Generate a UI configuration based on user requirements
 * This is the main entry point for app generation
 */
export const generateUIFromRequirements = async (
  requirements: AppRequirements,
  useSmartGeneration: boolean = false
): Promise<UIConfig> => {
  try {
    console.log('Starting app generation from requirements:', JSON.stringify(requirements, null, 2));
    console.log('useSmartGeneration flag:', useSmartGeneration);
    
    // Determine if we should use OpenAI or Smart Generation
    if (useSmartGeneration) {
      console.log('Using Smart Generation API');
      const result = await generateUIWithSmartGeneration(requirements);
      return result.config;
    } else {
      console.log('Using standard OpenAI API');
      return await generateUIWithOpenAI(requirements);
    }
  } catch (error) {
    console.error('Error in generateUIFromRequirements:', error);
    throw error;
  }
}; 