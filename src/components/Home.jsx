import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from './Button';
import '../styles/Home.css';

const Home = ({ onLogout, username }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/');
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-header">
          <h1>Welcome{username ? `, ${username}` : ''}</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            icon="🚪"
            size="small"
          >
            Logout
          </Button>
        </div>
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
          <Link to="/quiz-creator" className="nav-link">
            Create Quiz
          </Link>
          <Link to="/quiz-attempt" className="nav-link">
            Take Quiz
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default Home;
