import React, { useEffect, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { RootState } from './store';
import { setupAuthListener } from './store/slices/authSlice';
import axios from 'axios';
import './App.css';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/layout/Layout';
import FaceDetectionApp from './examples/FaceDetectionApp';
import PopulationComparisonChart from './examples/PopulationComparisonChart';
import MorpheoPopulationChart from './examples/MorpheoPopulationChart';
import SimplifiedChart from './examples/SimplifiedChart';

// Import components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import { UIGenerator } from './components/generator/UIGenerator';
import UIPreview from './components/preview/UIPreview';
import SavedUIs from './components/saved/SavedUIs';
import NotFound from './components/common/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './components/ui/state/Store';
import TestPage from './pages/TestPage';

// Import Morpheo component system
import DynamicComponent, { ProcessAppConfig } from './components/ui/DynamicComponent';
import { registerAllComponents } from './components/ui/ComponentRegistry';

// Lazy load components to reduce initial bundle size
// const ChartsExample = lazy(() => import('./examples/ChartsExample'));
const BitcoinChart = lazy(() => import('./examples/BitcoinChart'));
const AsyncComponentExample = lazy(() => import('./examples/AsyncComponentExample'));
const DynamicLibraryExample = lazy(() => import('./examples/DynamicLibraryExample'));

// Set up axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Initialize Morpheo API
function initializeMorpheoAPI() {
  // Register all components
  registerAllComponents();
  
  // Create global Morpheo API
  window.$morpheo = {
    renderApp: (config: any, target: string) => {
      const targetElement = document.querySelector(target);
      if (!targetElement) {
        console.error(`Target element not found: ${target}`);
        return;
      }
      
      // Create React root and render the app
      const ReactDOM = require('react-dom/client');
      const root = ReactDOM.createRoot(targetElement);
      root.render(
        <React.StrictMode>
          <ProcessAppConfig config={config} />
        </React.StrictMode>
      );
    },
    
    DynamicComponent,
    ProcessAppConfig
  };
  
  // Add a shorthand for DOM operations
  window.$m = (selector: string) => {
    return {
      element: () => document.querySelector(selector),
      value: (newValue?: any) => {
        const el = document.querySelector(selector) as HTMLInputElement;
        if (!el) return null;
        
        if (newValue !== undefined) {
          el.value = newValue;
          return newValue;
        }
        
        return el.value;
      },
      text: (newText?: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        
        if (newText !== undefined) {
          el.textContent = newText;
          return newText;
        }
        
        return el.textContent;
      }
    };
  };
  
  console.log('Morpheo API initialized');
}

function App() {
  const dispatch = useDispatch();
  const { mode } = useSelector((state: RootState) => state.theme);
  
  useEffect(() => {
    // Set up Firebase auth listener
    const unsubscribe = setupAuthListener(dispatch);
    
    // Initialize Morpheo API
    initializeMorpheoAPI();
    
    // Clean up listener on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch]);
  
  // Set up OpenAI API key from environment variable
  useEffect(() => {
    if (process.env.REACT_APP_OPENAI_API_KEY) {
      console.log('OpenAI API key is configured');
    } else {
      console.warn('OpenAI API key is not configured. UI generation with OpenAI will not work.');
    }
  }, []);
  
  return (
    <div className={`min-h-screen ${mode === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <ErrorBoundary>
        <Router>
          <Header />
          <main className="container mx-auto px-4 py-8 min-h-[calc(100vh-160px)]">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/generate" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <UIGenerator />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/preview" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <UIPreview />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/saved" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <SavedUIs />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              <Route path="/test" element={<TestPage />} />
              <Route path="/bitcoin-chart" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <BitcoinChart />
                </Suspense>
              } />
              {/* Comment out the route to ChartsExample */}
              {/* <Route path="/examples/charts" element={<ChartsExample />} /> */}
              <Route path="/async-components" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <AsyncComponentExample />
                </Suspense>
              } />
              <Route path="/dynamic-libraries" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <DynamicLibraryExample />
                </Suspense>
              } />
              <Route path="/face-detection" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <FaceDetectionApp />
                </Suspense>
              } />
              <Route path="/examples/population-chart" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <PopulationComparisonChart />
                </Suspense>
              } />
              <Route path="/examples/morpheo-population" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <MorpheoPopulationChart />
                </Suspense>
              } />
              <Route path="/examples/simple-chart" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <SimplifiedChart />
                </Suspense>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </Router>
      </ErrorBoundary>
    </div>
  );
}

export default App;
