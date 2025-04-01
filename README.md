# Morpheo - AI-Powered Dynamic UI Generator

Morpheo is a web application that allows users to describe the UI and functionality they want, and the app will generate the requested interface in real-time using AI.

## Features

- **Natural Language Processing (NLP)**: Integrates OpenAI's GPT API to process user input and convert descriptions into structured UI components.
- **Dynamic UI Generation**: Uses React.js with Tailwind CSS for frontend rendering with a component-based system.
- **Modular Functionalities**: Dynamically loads functionality modules like calculators, to-do lists, finance trackers, etc.
- **State Management**: Uses Redux Toolkit to manage user-generated UIs and states.
- **User Authentication**: Firebase Authentication for user management.
- **User Preferences**: Stores user settings in Firebase Firestore.
- **Backend API**: FastAPI provides an API to store and retrieve UI configurations and handle user authentication.
- **Live UI Updates**: Implements WebSockets for real-time UI changes.

## Tech Stack

- **Frontend**: React.js + TypeScript + Tailwind CSS
- **State Management**: Redux Toolkit
- **Authentication & Database**: Firebase (Authentication & Firestore)
- **Backend**: FastAPI (Python)
- **AI Model**: OpenAI's GPT API

## Project Structure

- **frontend-new/**: The main React TypeScript application with Firebase integration
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

### Creating a Calculator

User prompt: "Create a calculator with large buttons, dark mode, and a history feature."

The system will generate a React-based calculator UI with large buttons, stored history, and dark mode applied.

### Creating a Finance Dashboard

User prompt: "I need a finance dashboard with a pie chart, an income/expense tracker, and weekly summaries."

The system will generate a finance dashboard with user-input fields, a chart, and real-time updates.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the GPT API
- React.js and Tailwind CSS communities for their excellent documentation
- Firebase for authentication and database services 