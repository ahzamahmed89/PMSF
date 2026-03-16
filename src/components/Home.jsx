import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from './Button';
import Modal from './Modal';
import IconPicker from './IconPicker';
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
    productKnowledge: false,
    employeeManagement: false
  });
  const [marqueeItems, setMarqueeItems] = useState([]);
  const [showMarqueeEditor, setShowMarqueeEditor] = useState(false);
  const [newMarqueeText, setNewMarqueeText] = useState('');
  const [newMarqueeIcon, setNewMarqueeIcon] = useState('');
  const [showIconPickerNew, setShowIconPickerNew] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [showIconPickerEdit, setShowIconPickerEdit] = useState(false);
  const [pendingQuizCount, setPendingQuizCount] = useState(0);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch marquee items from database
  const fetchMarqueeItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/marquee-items`);
      if (response.data.success) {
        setMarqueeItems(response.data.items);
      } else {
        // Try as array response if success field missing
        setMarqueeItems(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching marquee items:', error);
    }
  };

  const fetchPendingQuizCount = async () => {
    try {
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
      const currentUsername = localStorage.getItem('username') || username;

      if (!authToken || !currentUsername) {
        setPendingQuizCount(0);
        return;
      }

      const response = await axios.get(`${API_URL}/quiz-assignments/my-quizzes/${currentUsername}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const assignedQuizzes = Array.isArray(response.data)
        ? response.data
        : (response.data?.assigned_quizzes || []);

      let progressMap = {};
      try {
        const progressResponse = await axios.get(`${API_URL}/quiz-attempts/progress/${currentUsername}`);
        const progressRows = Array.isArray(progressResponse.data) ? progressResponse.data : [];
        progressMap = progressRows.reduce((acc, row) => {
          acc[row.quiz_id] = row;
          return acc;
        }, {});
      } catch (progressError) {
        console.warn('Could not fetch quiz attempt progress for pending count:', progressError);
      }

      const isSuccessfullyAttempted = (quiz) => {
        const progress = progressMap[quiz.quiz_id];
        if (progress?.successful_attempts > 0) return true;
        if (quiz.score !== null && quiz.passing_marks !== null) {
          return Number(quiz.score) >= Number(quiz.passing_marks);
        }
        return false;
      };

      const pending = assignedQuizzes.filter((quiz) => !isSuccessfullyAttempted(quiz));
      setPendingQuizCount(pending.length);
    } catch (error) {
      console.error('Error fetching pending quiz count:', error);
      setPendingQuizCount(0);
    }
  };

  const handleEditMarquee = () => {
    setShowMarqueeEditor(true);
  };

  const handleAddMarqueeItem = async () => {
    if (!newMarqueeText.trim()) {
      alert('Please enter text content');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/marquee-items`,
        {
          text_content: newMarqueeText,
          icon: newMarqueeIcon
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchMarqueeItems();
        setNewMarqueeText('');
        setNewMarqueeIcon('');
      }
    } catch (error) {
      console.error('Error adding marquee item:', error);
      alert('Failed to add marquee item');
    }
  };

  const handleUpdateMarqueeItem = async (id) => {
    if (!editingText.trim()) {
      alert('Please enter text content');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `${API_URL}/marquee-items/${id}`,
        {
          text_content: editingText,
          icon: editingIcon
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchMarqueeItems();
        setEditingItemId(null);
        setEditingText('');
        setEditingIcon('');
      }
    } catch (error) {
      console.error('Error updating marquee item:', error);
      alert('Failed to update marquee item');
    }
  };

  const handleDeleteMarqueeItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.delete(
        `${API_URL}/marquee-items/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchMarqueeItems();
      }
    } catch (error) {
      console.error('Error deleting marquee item:', error);
      alert('Failed to delete marquee item');
    }
  };

  const handleToggleMarqueeItem = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.patch(
        `${API_URL}/marquee-items/${id}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        await fetchMarqueeItems();
      }
    } catch (error) {
      console.error('Error toggling marquee item:', error);
      alert('Failed to toggle marquee item');
    }
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditingText(item.text_content);
    setEditingIcon(item.icon || '');
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditingText('');
    setEditingIcon('');
  };

  const handleCloseMarqueeEditor = () => {
    setShowMarqueeEditor(false);
    setNewMarqueeText('');
    setNewMarqueeIcon('');
    setShowIconPickerNew(false);
    setEditingItemId(null);
    setEditingText('');
    setEditingIcon('');
    setShowIconPickerEdit(false);
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

  // Fetch marquee items on mount
  useEffect(() => {
    fetchMarqueeItems();
    fetchPendingQuizCount();
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
          {hasPermission('QUIZ_ATTEMPT') && (
            <button
              className="quiz-alert-btn"
              onClick={() => navigate('/quiz-attempt')}
              title={pendingQuizCount > 0 ? `${pendingQuizCount} pending quiz` : 'No pending quizzes'}
            >
              <span>🎓</span>
              {pendingQuizCount > 0 && (
                <span className="quiz-alert-badge">{pendingQuizCount}</span>
              )}
            </button>
          )}
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

      {/* Latest Updates Marquee */}
      <div className="marquee-wrapper">
        <div className="marquee-content">
          <span className="marquee-heading">Latest Updates:</span>
          <span className="marquee-text">
            {marqueeItems.map((item, index) => (
              <span key={item.id}>
                {item.icon && `${item.icon} `}{item.text_content}
                {index < marqueeItems.length - 1 && ' • '}
              </span>
            ))}
          </span>
        </div>
        {hasPermission('MARQUEE_EDIT') && (
          <button className="marquee-edit-btn" onClick={handleEditMarquee} title="Edit Marquee">
            ✏️
          </button>
        )}
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
                        📖 Attempt Quiz
                      </Link>
                    )}
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link to="/quiz-assignments" className="nav-link" onClick={() => setShowMenu(false)}>
                        📋 Assign Quizzes
                      </Link>
                    )}
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link
                        to="/quiz-assignments"
                        state={{ initialTab: 'overview' }}
                        className="nav-link"
                        onClick={() => setShowMenu(false)}
                      >
                        📊 Quiz Overview
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Employee Management Section */}
              {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                <div className="menu-section">
                  <div
                    className={`section-title ${expandedSections.employeeManagement ? 'expanded' : ''}`}
                    onClick={() => toggleSection('employeeManagement')}
                  >
                    <span>Employee Management</span>
                    <span className={`dropdown-icon ${expandedSections.employeeManagement ? 'expanded' : ''}`}>▼</span>
                  </div>
                  {expandedSections.employeeManagement && (
                    <div className="section-items">
                      <Link to="/employees" className="nav-link" onClick={() => setShowMenu(false)}>
                        👥 Manage Employees
                      </Link>
                    </div>
                  )}
                  </div>
              )}

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

      {/* Marquee Editor Modal */}
      <Modal
        isOpen={showMarqueeEditor}
        onClose={handleCloseMarqueeEditor}
        title="Manage Latest Updates"
        size="large"
      >
        <div className="marquee-editor">
          {/* Add New Item Section */}
          <div className="marquee-add-section">
            <h3>Add New Update</h3>
            <div className="marquee-input-row">
              <div className="icon-input-wrapper">
                <button 
                  className="icon-input-btn"
                  onClick={() => setShowIconPickerNew(!showIconPickerNew)}
                  title="Select icon"
                >
                  {newMarqueeIcon || '🔷'}
                </button>
                {showIconPickerNew && (
                  <IconPicker 
                    value={newMarqueeIcon}
                    onChange={setNewMarqueeIcon}
                    onClose={() => setShowIconPickerNew(false)}
                  />
                )}
              </div>
              <input
                type="text"
                className="marquee-text-input"
                value={newMarqueeText}
                onChange={(e) => setNewMarqueeText(e.target.value)}
                placeholder="Enter update text..."
                maxLength="500"
              />
              <Button onClick={handleAddMarqueeItem} variant="primary">
                Add
              </Button>
            </div>
          </div>

          {/* Existing Items List */}
          <div className="marquee-items-list">
            <h3>Current Updates ({marqueeItems.length})</h3>
            {marqueeItems.length === 0 ? (
              <p className="no-items-message">No updates yet. Add your first update above!</p>
            ) : (
              <div className="marquee-items">
                {marqueeItems.map((item) => (
                  <div key={item.id} className="marquee-item">
                    {editingItemId === item.id ? (
                      <div className="marquee-item-edit">
                        <div className="icon-input-wrapper">
                          <button 
                            className="icon-input-btn"
                            onClick={() => setShowIconPickerEdit(!showIconPickerEdit)}
                            title="Select icon"
                          >
                            {editingIcon || '🔷'}
                          </button>
                          {showIconPickerEdit && (
                            <IconPicker 
                              value={editingIcon}
                              onChange={setEditingIcon}
                              onClose={() => setShowIconPickerEdit(false)}
                            />
                          )}
                        </div>
                        <input
                          type="text"
                          className="marquee-text-input"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          placeholder="Text"
                          maxLength="500"
                        />
                        <div className="marquee-item-actions">
                          <Button onClick={() => handleUpdateMarqueeItem(item.id)} variant="primary" size="small">
                            Save
                          </Button>
                          <Button onClick={cancelEditItem} variant="outline" size="small">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="marquee-item-view">
                        <span className="marquee-item-content">
                          {item.icon && <span className="marquee-item-icon">{item.icon}</span>}
                          <span className="marquee-item-text">{item.text_content}</span>
                        </span>
                        <div className="marquee-item-actions">
                          <button 
                            onClick={() => handleToggleMarqueeItem(item.id)} 
                            className="marquee-action-btn toggle-btn" 
                            title={item.is_enabled ? "Disable" : "Enable"}
                          >
                            {item.is_enabled ? '✓' : '○'}
                          </button>
                          <button onClick={() => startEditItem(item)} className="marquee-action-btn edit-btn" title="Edit">
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteMarqueeItem(item.id)} className="marquee-action-btn delete-btn" title="Delete">
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="marquee-editor-footer">
            <Button onClick={handleCloseMarqueeEditor} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Home;
