import React, { useEffect, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RootState } from './store';
import { setupAuthListener } from './store/slices/authSlice';
import axios from 'axios';
import './App.css';
import ChartGeneratorPage from './pages/ChartGeneratorPage';
import DataSeriesPage from './pages/DataSeriesPage';
import { Analytics } from '@vercel/analytics/react';

// Import components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import NotFound from './components/common/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppSelector } from './store/hooks';
import GeneratorPage from './pages/GeneratorPage';
import SavedPage from './pages/SavedPage';

// Import Toaster
import { Toaster } from 'react-hot-toast';

// Lazy load components to reduce initial bundle size
// const ChartsExample = lazy(() => import('./examples/ChartsExample'));

// Set up axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

// Protected route component (defined inline)
const ProtectedRouteComponent = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAppSelector((state: RootState) => state.auth);
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function App() {
  const dispatch = useDispatch();
  const { mode } = useAppSelector((state: RootState) => state.theme);
  
  useEffect(() => {
    // Set up Firebase auth listener
    const unsubscribe = setupAuthListener(dispatch);
    
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
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
      />
      <ErrorBoundary>
        <Router>
          <Header />
          <main className="container mx-auto px-4 py-8 min-h-[calc(100vh-160px)]">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <ProtectedRouteComponent>
                  <ErrorBoundary>
                    <GeneratorPage />
                  </ErrorBoundary>
                </ProtectedRouteComponent>
              } />
              <Route path="/generate" element={
                <ProtectedRouteComponent>
                  <ErrorBoundary>
                    <GeneratorPage />
                  </ErrorBoundary>
                </ProtectedRouteComponent>
              } />
              <Route path="/saved" element={
                <ProtectedRouteComponent>
                  <SavedPage />
                </ProtectedRouteComponent>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </Router>
      </ErrorBoundary>
      <Analytics />
    </div>
  );
}

export default App;
