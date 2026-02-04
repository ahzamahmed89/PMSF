import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome</h1>
        <p>Select an option to continue:</p>
        <nav className="home-nav">
          <Link to="/entry-module" className="nav-link">
            Entry Module
          </Link>
          <Link to="/view-module" className="nav-link">
            View Data
          </Link>
          <Link to="/data-manager" className="nav-link">
            Checklist Manager
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default Home;
