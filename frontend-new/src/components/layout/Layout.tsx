import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

/**
 * Main layout component
 * Contains the header, sidebar, content area, and footer
 */
const Layout: React.FC = () => {
  return (
    <div className="layout-container">
      <Header />
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-3 col-lg-2 d-md-block sidebar-container">
            <Sidebar />
          </div>
          <main className="col-md-9 col-lg-10 ms-sm-auto px-md-4 py-4">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Layout; 