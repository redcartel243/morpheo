import React from 'react';
import { Link } from 'react-router-dom';

const Navigation: React.FC = () => {
  return (
    <nav className="hidden md:flex items-center space-x-6">
      <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">Home</Link>
      <Link to="/charts" className="text-gray-700 hover:text-blue-600 transition-colors">Charts</Link>
      <li className="nav-item">
        <Link className="nav-link" to="/face-detection">
          Face Detection App
        </Link>
      </li>
    </nav>
  );
};

export default Navigation; 