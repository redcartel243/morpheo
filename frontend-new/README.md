# Morpheo - AI-Powered Dynamic UI Generator

Morpheo is an AI-powered application that allows users to generate dynamic UI components based on their requirements. It uses OpenAI for generating UI configurations and Firebase for authentication and data storage.

## Features

- User authentication with Firebase
- Dynamic UI generation with OpenAI
- Real-time UI preview
- Save and manage UI configurations
- Dark/light mode support

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account
- OpenAI API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Set up Authentication with Email/Password provider
   - Create a Firestore database
   - Register a web app and get your Firebase configuration

4. Create a `.env` file in the project root based on `.env.example`:
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

5. Start the development server:
   ```
   npm start
   ```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Deployment

### Firebase Hosting

1. Install Firebase CLI:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Initialize Firebase:
   ```
   firebase init
   ```
   - Select Hosting
   - Select your Firebase project
   - Set public directory to `build`
   - Configure as a single-page app: `Yes`

4. Build the project:
   ```
   npm run build
   ```

5. Deploy to Firebase:
   ```
   firebase deploy
   ```

## Project Structure

- `/src/components`: React components
  - `/auth`: Authentication components
  - `/common`: Common UI components
  - `/dashboard`: Dashboard components
  - `/generator`: UI generation components
  - `/layout`: Layout components
  - `/preview`: UI preview components
  - `/saved`: Saved UIs components
  - `/ui`: Dynamic UI components
- `/src/config`: Configuration files
- `/src/services`: Service files for API calls
- `/src/store`: Redux store and slices
- `/src/utils`: Utility functions

## License

MIT

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
