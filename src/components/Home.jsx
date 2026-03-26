import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from './Button';
import Modal from './Modal';
import IconPicker from './IconPicker';
import PageHeader from './PageHeader';
import { API_URL } from '../config/api';
import '../styles/Home.css';

const Home = ({ onLogout }) => {
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState(JSON.parse(localStorage.getItem('userRoles') || '[]'));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [marqueeItems, setMarqueeItems] = useState([]);
  const [showMarqueeEditor, setShowMarqueeEditor] = useState(false);
  const [newMarqueeText, setNewMarqueeText] = useState('');
  const [newMarqueeIcon, setNewMarqueeIcon] = useState('');
  const [showIconPickerNew, setShowIconPickerNew] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [showIconPickerEdit, setShowIconPickerEdit] = useState(false);

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
  }, []);

  // Check if user is admin and get permissions
  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');
  const displayMarqueeItems = marqueeItems.length > 0
    ? marqueeItems
    : [{ id: 'fallback', icon: '📢', text_content: 'No updates available' }];
  
  // Helper function to check permission
  const hasPermission = (permission) => userPermissions.includes(permission);

  return (
    <div className="home-container">
      <PageHeader onLogout={onLogout} />

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
          <div className="marquee-track">
            <span className="marquee-text">
              {displayMarqueeItems.map((item, index) => (
                <span key={`primary-${item.id}`}>
                  {item.icon && `${item.icon} `}{item.text_content}
                  {index < displayMarqueeItems.length - 1 && ' • '}
                </span>
              ))}
            </span>
            <span className="marquee-text" aria-hidden="true">
              {displayMarqueeItems.map((item, index) => (
                <span key={`duplicate-${item.id}`}>
                  {item.icon && `${item.icon} `}{item.text_content}
                  {index < displayMarqueeItems.length - 1 && ' • '}
                </span>
              ))}
            </span>
          </div>
        </div>
        {hasPermission('MARQUEE_EDIT') && (
          <button className="marquee-edit-btn" onClick={handleEditMarquee} title="Edit Marquee">
            ✏️
          </button>
        )}
      </div>

      {/* Marquee Editor Modal */}
      <Modal
        isOpen={showMarqueeEditor}
        onClose={handleCloseMarqueeEditor}
        title="Manage Latest Updates"
        size="large"
        className="marquee-modal"
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
