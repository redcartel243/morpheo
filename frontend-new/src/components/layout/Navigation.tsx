import React from 'react';
import { Link } from 'react-router-dom';

const Navigation: React.FC = () => {
  return (
    <nav className="hidden md:flex items-center space-x-6">
      <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">Home</Link>
      <Link to="/chart-generator" className="text-gray-700 hover:text-blue-600 transition-colors">Chart Generator</Link>
      <Link to="/face-detection" className="text-gray-700 hover:text-blue-600 transition-colors">Face Detection</Link>
      <Link to="/data-series" className="text-gray-700 hover:text-blue-600 transition-colors">Data Series</Link>
    </nav>
  );
};

export default Navigation; 