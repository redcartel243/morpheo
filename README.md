# Morpheo - AI-Powered Dynamic UI Generator

Morpheo is a web application that allows users to describe the UI and functionality they want, and the app will generate the requested interface in real-time using AI.

## Features

- **Natural Language Processing (NLP)**: Integrates OpenAI's GPT API to process user input and convert descriptions into structured UI components.
- **Dynamic UI Generation**: Uses React.js with Tailwind CSS for frontend rendering with a component-based system.
- **Modular Functionalities**: Dynamically loads functionality modules based on user requirements.
- **State Management**: Uses Redux Toolkit to manage user-generated UIs and states.
- **User Authentication**: Firebase Authentication for user management.
- **User Preferences**: Stores user settings in Firebase Firestore.
- **Backend API**: FastAPI provides an API to store and retrieve UI configurations and handle user authentication.
- **Live UI Updates**: Implements WebSockets for real-time UI changes.
- **Dynamic Library Loading**: Dynamically loads external JavaScript libraries on-demand, reducing initial load time and bundle size.
- **Component Factory**: Creates UI components that can dynamically load their dependencies when needed.
- **Intelligent Data Visualization**: Supports multiple charting libraries that are loaded only when required.
- **Lazy-loaded Components**: Uses React.Suspense and lazy loading for better performance.
- **Enhanced Component System**: Robust component registration and fallback system for graceful error handling.
- **DOM Manipulation Utility**: Built-in `$m` utility for safe DOM operations and event handling.
- **Flexible Event System**: Supports both method-based and event-based component interactions.

## Recent Updates

### Component System Improvements
- **Fallback Components**: Enhanced fallback system that provides informative error messages and component state visualization
- **Dynamic Component Loading**: Improved component loading with better error handling and type checking
- **Event Handling**: Robust event system that supports multiple event naming conventions and method execution patterns
- **DOM Manipulation**: New `$m` utility for safe DOM operations with proper event propagation
- **Component Props**: Better handling of component properties with support for various data types and formats
- **Method Execution**: Enhanced method execution system that supports multiple code formats
- **State Management**: Improved state handling for component operations
- **Event Propagation**: Proper event bubbling and handling for component interactions
- **Error Handling**: Improved error catching and reporting for all operations

## Tech Stack

- **Frontend**: React.js + TypeScript + Tailwind CSS
- **State Management**: Redux Toolkit
- **Authentication & Database**: Firebase (Authentication & Firestore)
- **Backend**: FastAPI (Python)
- **AI Model**: OpenAI's GPT API
- **Dynamic Libraries**: Support for 25+ external libraries including visualization, mapping, ML, and more

## Project Structure

- **frontend-new/**: The main React TypeScript application with Firebase integration
  - **src/utils/LibraryManager.ts**: Core utility for dynamic library loading
  - **src/hooks/useLibrary.ts**: React hooks for working with dynamic libraries
  - **src/components/ui/ComponentFactory.ts**: Factory for creating components with dynamic dependencies
  - **src/components/ui/LibraryLoader.tsx**: React component for declarative library loading
  - **src/examples/**: Example components demonstrating dynamic library usage
- **backend/**: FastAPI backend for additional server-side functionality
- **frontend/**: Legacy frontend (deprecated)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Python 3.10 or higher
- Firebase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/morpheo.git
   cd morpheo
   ```

2. Set up the frontend:
   ```
   cd frontend-new
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the frontend-new directory based on the `.env.example` file
   - Add your OpenAI API key and Firebase credentials

4. Set up the backend (optional):
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   - Create a `.env` file in the backend directory based on the `.env.example` file

### Running the Application

1. Start the frontend development server:
   ```
   cd frontend-new
   npm start
   ```

2. Start the backend server (optional):
   ```
   cd backend
   uvicorn main:app --reload
   ```

3. Open your browser and navigate to `http://localhost:3000`

4. Check out the example components:
   - Dynamic library examples: `http://localhost:3000/dynamic-libraries`
   - Async component examples: `http://localhost:3000/async-components`
   - Chart examples: `http://localhost:3000/charts`

### Deployment

1. Build the frontend:
   ```
   cd frontend-new
   npm run build
   ```

2. Deploy to Firebase:
   ```
   firebase deploy
   ```

## Environment Setup

### Frontend Environment Variables (.env)

```
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# OpenAI Configuration
REACT_APP_OPENAI_API_KEY=your_openai_api_key

# Feature Flags
REACT_APP_USE_OPENAI=true

# API Configuration
REACT_APP_API_URL=http://localhost:8000
```

### Backend Environment Variables (.env)

```
# API Keys
OPENAI_API_KEY=your_openai_api_key

# Security
SECRET_KEY=your_secret_key_for_jwt_tokens

# Firebase (if using Firebase)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
```

## Example Usage

### Creating Dynamic UIs

User prompt: "Create an interface with input fields and action buttons."

The system will generate a React-based UI with the requested components and functionality.

### Creating Data Visualizations

User prompt: "I need a dashboard with charts and data display components."

The system will generate an interface with appropriate visualization components and data handling.

## Supported Libraries

Morpheo's dynamic library system supports over 25 popular JavaScript libraries, including:

### Visualization
- Chart.js
- D3.js
- ECharts
- Plotly.js
- ApexCharts
- Highcharts

### Maps & Geospatial
- Leaflet
- Mapbox GL
- Google Maps

### Rich Text Editing
- Quill
- TinyMCE
- Monaco Editor (VS Code's editor)

### AI & Machine Learning
- TensorFlow.js
- ML5.js
- Face-API.js

### 3D & Graphics
- Three.js
- Babylon.js
- P5.js

### UI Frameworks
- Bootstrap
- Material Components
- Tailwind CSS

### Utilities
- Lodash
- Moment.js
- Day.js
- Axios

## Key Benefits of Dynamic Library Loading

1. **Reduced Initial Load Time**: Only load libraries when they're actually needed
2. **Smaller Bundle Size**: Keep your application lightweight
3. **Version Management**: Load specific versions of libraries as needed
4. **Dependency Handling**: Automatically manage dependencies between libraries
5. **Fallback Support**: Gracefully handle loading failures
6. **Cross-Library Interoperability**: Use multiple libraries together seamlessly
7. **Progressive Enhancement**: Start with basic functionality and enhance as libraries load

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the GPT API
- React.js and Tailwind CSS communities for their excellent documentation
- Firebase for authentication and database services 
- All the library creators whose work is dynamically loaded in this project 