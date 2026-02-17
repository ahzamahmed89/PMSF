import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from './Button';
import { API_URL } from '../config/api';
import '../styles/Home.css';

const Home = ({ onLogout, username }) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRoles, setUserRoles] = useState(JSON.parse(localStorage.getItem('userRoles') || '[]'));
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    branchMystery: false,
    productKnowledge: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Image carousel
  const images = [
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
    'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80',
    'https://images.unsplash.com/photo-1573167243872-43c6433b9d40?w=800&q=80',
    'https://images.unsplash.com/photo-1556742521-9713bf272865?w=800&q=80'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/');
  };

  const refreshSession = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Update localStorage with fresh data
        localStorage.setItem('userRoles', JSON.stringify(response.data.user.roles));
        localStorage.setItem('userPermissions', JSON.stringify(response.data.user.permissions || []));
        localStorage.setItem('username', response.data.user.username);
        localStorage.setItem('userEmail', response.data.user.email);
        localStorage.setItem('userFullName', response.data.user.fullName);
        
        // Update state to trigger re-render
        setUserRoles(response.data.user.roles);
        
        alert('Session refreshed successfully!');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      alert('Failed to refresh session');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if user is admin and get permissions
  const isAdmin = userRoles.includes('Admin');
  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');
  
  // Helper function to check permission
  const hasPermission = (permission) => userPermissions.includes(permission);

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-page-header">
        <div className="header-left">
          <Button 
            variant="primary" 
            onClick={() => setShowMenu(!showMenu)}
            icon="☰"
          >
            Menu
          </Button>
        </div>
        <div className="header-center">
          <span className="welcome-text">Welcome{username ? `, ${username}` : ''}</span>
        </div>
        <div className="header-right">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            icon="🚪"
            size="small"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="home-main">
        {/* Center Content */}
        <div className="center-content">
          <h1 className="app-title">Dubai Islamic Bank</h1>
          <h2 className="app-subtitle">Service & Quality</h2>
        </div>

        {/* Right Side - Image Carousel */}
        <div className="image-carousel">
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`Slide ${index + 1}`}
              className={`carousel-image ${index === currentImageIndex ? 'active' : ''}`}
            />
          ))}
          <div className="carousel-dots">
            {images.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="dropdown-menu"
          onClick={() => setShowMenu(false)}
        >
          <div className="menu-content" onClick={(e) => e.stopPropagation()}>
            <nav className="menu-nav">
              {/* Branch Mystery Shopping Section */}
              <div className="menu-section">
                <div 
                  className={`section-title ${expandedSections.branchMystery ? 'expanded' : ''}`}
                  onClick={() => toggleSection('branchMystery')}
                >
                  <span>Branch Mystery Shopping</span>
                  <span className={`dropdown-icon ${expandedSections.branchMystery ? 'expanded' : ''}`}>▼</span>
                </div>
                {expandedSections.branchMystery && (
                  <div className="section-items">
                    {hasPermission('ENTRY_MODULE') && (
                      <Link to="/entry-module" className="nav-link" onClick={() => setShowMenu(false)}>
                        📝 Entry Module
                      </Link>
                    )}
                    {hasPermission('VIEW_DATA') && (
                      <Link to="/view-module" className="nav-link" onClick={() => setShowMenu(false)}>
                        👁️ View Data
                      </Link>
                    )}
                    {hasPermission('DATA_MANAGER') && (
                      <Link to="/data-manager" className="nav-link" onClick={() => setShowMenu(false)}>
                        📋 Checklist Manager
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Product Knowledge Section */}
              <div className="menu-section">
                <div 
                  className={`section-title ${expandedSections.productKnowledge ? 'expanded' : ''}`}
                  onClick={() => toggleSection('productKnowledge')}
                >
                  <span>Product Knowledge</span>
                  <span className={`dropdown-icon ${expandedSections.productKnowledge ? 'expanded' : ''}`}>▼</span>
                </div>
                {expandedSections.productKnowledge && (
                  <div className="section-items">
                    {hasPermission('QUIZ_CREATE') && (
                      <Link to="/quiz-creator" className="nav-link" onClick={() => setShowMenu(false)}>
                        ✏️ Create Quiz
                      </Link>
                    )}
                    {hasPermission('QUIZ_ATTEMPT') && (
                      <Link to="/quiz-attempt" className="nav-link" onClick={() => setShowMenu(false)}>
                        📖 Take Quiz
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Admin Section */}
              {(isAdmin || hasPermission('USER_MANAGEMENT')) && (
                <div className="menu-section">
                  <Link to="/admin" className="nav-link admin-link" onClick={() => setShowMenu(false)}>
                    ⚙️ Admin Panel
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
