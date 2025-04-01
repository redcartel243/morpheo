# Morpheo Project Setup Guide

This guide will help you set up the Morpheo project for development.

## Prerequisites

- Python 3.10+
- Node.js 14+
- npm 6+
- Git

## Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/morpheo.git
   cd morpheo
   ```

2. Set up the Python environment:
   ```bash
   # Create a virtual environment
   python -m venv venv
   
   # Activate the virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. Set up the frontend:
   ```bash
   cd frontend-new
   npm install
   ```

## Environment Configuration

1. Create environment files:
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `frontend-new/.env.example` to `frontend-new/.env`

2. Add your API keys and other secret information to these files:
   - OpenAI API key
   - Firebase credentials

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd frontend-new
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Development Guidelines

- Follow the project's core principles as described in the `morpheo-cursor-rules.mdc` file
- The project should have no application-specific logic
- All component selection, connection, and behavior must come from the AI
- Before committing code, run linting and formatting tools:
  ```bash
  # Backend
  black backend
  flake8 backend
  
  # Frontend
  cd frontend-new
  npm run lint
  ``` 