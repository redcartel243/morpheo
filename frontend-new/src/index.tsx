import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { store } from './store';
// Import ChakraProvider and theme
// --- Removed Chakra Imports as we uninstalled it ---
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

// --- Removed Obsolete Component Registry Imports/Calls ---
// Register all components with the component registry
// import { registerAllComponents } from './components/ui/ComponentRegistry';
// 
// // Initialize intelligent components
// import './components/ui/intelligent/components/Button';
// import './components/ui/intelligent/components/TextInput';
// 
// // Initialize component registry
// registerAllComponents();
// --- End Removed Obsolete ---

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      {/* --- Remove ChakraProvider wrapper --- */}
      <ChakraProvider value={defaultSystem}>
      <App />
      </ChakraProvider>
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
