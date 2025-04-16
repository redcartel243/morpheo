import axios from 'axios';

// Define enums for structured output
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  SCATTER = 'scatter',
  AREA = 'area',
  RADAR = 'radar',
  HEATMAP = 'heatmap'
}

export enum ChartLibrary {
  CHARTJS = 'chart.js',
  ECHARTS = 'echarts',
  PLOTLY = 'plotly',
  ANY = 'any'
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

// Define the chart configuration interface
export interface ChartConfiguration {
  chart_type: ChartType;
  data_source: string;
  x_key: string;
  y_key: string;
  title: string;
  subtitle?: string;
  height?: number;
  width?: string | number;
  library_preference?: ChartLibrary;
  color_scheme?: string[];
  theme?: Theme;
  options?: Record<string, any>;
}

// Define the interface for a data point
export interface DataPoint {
  [key: string]: string | number | Date;
}

// Define interface for grounding source
export interface GroundingSource {
  uri: string;
  title: string;
}

// Define interface for grounded data response
export interface GroundedDataResponse {
  result: any;
  grounding_metadata?: {
    sources: GroundingSource[];
  };
  status: string;
}

/**
 * Interface for the Gemini API response
 */
interface GeminiResponse {
  candidates: {
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }[];
}

/**
 * Get a token from the backend for authentication
 */
const getAuthToken = async (): Promise<string> => {
  try {
    // Get test credentials from environment variables
    const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
    const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'defaulttestpass';
    
    // Get a token from the backend
    const tokenResponse = await axios.post(
      `${process.env.REACT_APP_API_URL}/token`, 
      new URLSearchParams({
        'username': testUsername,
        'password': testPassword
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return tokenResponse.data.access_token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw new Error('Failed to authenticate with backend');
  }
};

/**
 * Generate a chart configuration using Gemini API with structured output
 * @param dataDescription Description of the data to visualize
 * @param purpose Purpose of the chart (what insights it should show)
 * @returns Structured chart configuration
 */
export const generateChartConfiguration = async (
  dataDescription: string, 
  purpose: string
): Promise<ChartConfiguration> => {
  try {
    console.log('Generating chart configuration with Gemini API');
    
    // Get auth token
    const token = await getAuthToken();
    
    // Define the schema for the structured output
    const schema = {
      type: 'object',
      properties: {
        chart_type: {
          type: 'string',
          enum: Object.values(ChartType)
        },
        data_source: {
          type: 'string'
        },
        x_key: {
          type: 'string'
        },
        y_key: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        subtitle: {
          type: 'string'
        },
        height: {
          type: 'number'
        },
        width: {
          type: 'string'
        },
        library_preference: {
          type: 'string',
          enum: Object.values(ChartLibrary)
        },
        color_scheme: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        theme: {
          type: 'string',
          enum: Object.values(Theme)
        },
        options: {
          type: 'object'
        }
      },
      required: ['chart_type', 'data_source', 'x_key', 'y_key', 'title'],
      propertyOrdering: ['chart_type', 'data_source', 'x_key', 'y_key', 'title', 'subtitle', 'height', 'width', 'library_preference', 'color_scheme', 'theme', 'options']
    };

    // Create the prompt for Gemini
    const prompt = `
Generate an optimal chart configuration for visualizing the following data:

Data Description: ${dataDescription}
Purpose: ${purpose}

The configuration should be appropriate for the type of data being visualized.
Please choose the most suitable chart type, axes, and styling options.
Do not include any domain-specific logic or hardcoded business logic in the configuration.
`;

    // Call the backend API which will proxy to Gemini
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/gemini-structured-output`,
      {
        prompt,
        schema,
        temperature: 0.2
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract the chart configuration from the response
    const chartConfig = response.data.result as ChartConfiguration;
    
    console.log('Generated chart configuration:', chartConfig);
    
    return chartConfig;
  } catch (error) {
    console.error('Error generating chart configuration:', error);
    throw new Error('Failed to generate chart configuration');
  }
};

/**
 * Fetch real-time data using Gemini API with Google Search grounding
 * @param dataDescription Description of the data to fetch
 * @param xKey The key for the x-axis data
 * @param yKey The key for the y-axis data
 * @param dataPoints Number of data points to request
 * @returns Array of data points with grounding metadata
 */
export const fetchGroundedData = async (
  dataDescription: string,
  xKey: string,
  yKey: string,
  dataPoints: number = 10
): Promise<{ data: DataPoint[]; sources: GroundingSource[] }> => {
  try {
    console.log(`Fetching grounded data for: ${dataDescription}`);
    
    // Get auth token
    const token = await getAuthToken();
    
    // Define schema for the data we want to get
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          [xKey]: { type: 'string' },
          [yKey]: { type: 'number' }
        },
        required: [xKey, yKey]
      }
    };
    
    // Create a prompt that asks for real-time data with a clear structure
    const prompt = `
Using the most current information available on the web, provide exactly ${dataPoints} data points for ${dataDescription}.

Format the data as an array of objects, where each object has two properties:
- "${xKey}": this should be a descriptive label or date
- "${yKey}": this should be a numerical value

Please ensure the data is factual, up-to-date, and correctly formatted.
It is crucial to provide EXACTLY ${dataPoints} data points, no more and no less.
`;
    
    // Call the backend API which will use Gemini with Google Search grounding
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/gemini-grounded-data`,
      {
        data_description: prompt,
        schema,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const responseData = response.data as GroundedDataResponse;
    
    // Extract data points and sources
    const data = responseData.result || [];
    const sources = responseData.grounding_metadata?.sources || [];
    
    console.log('Fetched grounded data:', data);
    console.log('Sources:', sources);
    
    return { data, sources };
  } catch (error) {
    console.error('Error fetching grounded data:', error);
    throw new Error('Failed to fetch data with Google Search grounding');
  }
};

/**
 * Convert a chart configuration to AdvancedChart props
 * @param config The chart configuration
 * @returns Props for the AdvancedChart component
 */
export const configToAdvancedChartProps = (config: ChartConfiguration): Record<string, any> => {
  return {
    type: config.chart_type,
    dataUrl: config.data_source,
    xKey: config.x_key,
    yKey: config.y_key,
    title: config.title,
    subtitle: config.subtitle,
    height: config.height || 400,
    width: config.width || '100%',
    libraryPreference: config.library_preference || 'any',
    colorScheme: config.color_scheme,
    theme: config.theme || 'light',
    options: config.options || {},
  };
}; 