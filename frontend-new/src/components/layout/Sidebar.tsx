import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="sidebar bg-light p-3">
      <h5 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
        <span>Examples</span>
      </h5>
      <ul className="nav flex-column">
        <li className="nav-item">
          <Link to="/" className="nav-link">Home</Link>
        </li>
        <li className="nav-item">
          <Link to="/examples/async" className="nav-link">Async Component</Link>
        </li>
        <li className="nav-item">
          <Link to="/examples/dynamic-library" className="nav-link">Dynamic Library</Link>
        </li>
        <li className="nav-item">
          <Link to="/examples/face-detection" className="nav-link">Face Detection</Link>
        </li>
        <li className="nav-item">
          <Link to="/examples/population-chart" className="nav-link">Population Chart</Link>
        </li>
        <li className="nav-item">
          <Link to="/examples/morpheo-population" className="nav-link">Morpheo Population Chart</Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar; 