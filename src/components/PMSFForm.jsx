import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ActivityCard from './ActivityCard';
import PreviousQuarterComparison from './PreviousQuarterComparison';
import '../styles/PMSFForm.css';

export default function PMSFForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const pmsfData = location.state?.pmsfData || [];
  const formData = location.state?.formData || {};
  const editMode = location.state?.editMode || false;
  const visitcode = location.state?.visitcode || null;

  const [loading, setLoading] = useState((editMode && visitcode) || pmsfData.length === 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousEntry, setPreviousEntry] = useState(null);
  const [showPreviousModal, setShowPreviousModal] = useState(false);
  const [selectedPreviousActivity, setSelectedPreviousActivity] = useState(null);
  
  const [activitiesData, setActivitiesData] = useState(
    pmsfData && pmsfData.length > 0 ? pmsfData.map(item => ({
      ...item,
      status: item.V_Status || item.status || '',
      responsibility: item.Responsibility || '',
      remarks: item.Remarks || item.remarks || '',
      media: { images: [], video: null },
      imglink1: item.imglink1 || null,
      imglink2: item.imglink2 || null,
      imglink3: item.imglink3 || null,
      videolink: item.videolink || null
    })) : []
  );

  // Fetch master data and existing data if needed
  useEffect(() => {
    const fetchData = async () => {
      try {
        // First, get master data if not provided or empty
        if (!pmsfData || pmsfData.length === 0) {
          console.log('Fetching master PMSF data...');
          const masterResponse = await axios.get(
            `http://${window.location.hostname}:5000/api/pmsf-master`
          );
          
          const masterData = masterResponse.data;
          console.log('Master data fetched:', masterData.length, 'items');
          
          // Initialize with master data
          const initializedData = masterData.map(item => ({
            ...item,
            status: item.V_Status || item.status || '',
            responsibility: item.Responsibility || '',
            remarks: item.Remarks || item.remarks || '',
            media: { images: [], video: null },
            imglink1: item.imglink1 || null,
            imglink2: item.imglink2 || null,
            imglink3: item.imglink3 || null,
            videolink: item.videolink || null
          }));
          
          setActivitiesData(initializedData);
          
          // Now fetch existing data if in edit mode
          if (editMode && visitcode) {
            console.log('Fetching existing data for visitcode:', visitcode);
            const existingResponse = await axios.get(
              `http://${window.location.hostname}:5000/api/pmsf-data/${visitcode}`
            );
            
            if (existingResponse.data.success && existingResponse.data.activities) {
              // Map existing activities by Code
              const existingActivitiesMap = {};
              existingResponse.data.activities.forEach(activity => {
                existingActivitiesMap[activity.Code] = activity;
              });

              console.log('Mapping existing data to master items...');
              
              // Update activities with existing data
              setActivitiesData(prevActivities =>
                prevActivities.map(item => {
                  const existing = existingActivitiesMap[item.Code];
                  if (existing) {
                    return {
                      ...item,
                      status: existing.V_Status || '',
                      responsibility: existing.Responsibility || '',
                      remarks: existing.Remarks || '',
                      imglink1: existing.imglink1 || null,
                      imglink2: existing.imglink2 || null,
                      imglink3: existing.imglink3 || null,
                      videolink: existing.videolink || null,
                      media: { images: [], video: null }
                    };
                  }
                  return item;
                })
              );
            }
          }
        } else if (editMode && visitcode) {
          // Master data is provided, just fetch existing data
          console.log('Fetching existing data for visitcode:', visitcode);
          const existingResponse = await axios.get(
            `http://${window.location.hostname}:5000/api/pmsf-data/${visitcode}`
          );
          
          if (existingResponse.data.success && existingResponse.data.activities) {
            const existingActivitiesMap = {};
            existingResponse.data.activities.forEach(activity => {
              existingActivitiesMap[activity.Code] = activity;
            });

            setActivitiesData(prevActivities =>
              prevActivities.map(item => {
                const existing = existingActivitiesMap[item.Code];
                if (existing) {
                  return {
                    ...item,
                    status: existing.V_Status || '',
                    responsibility: existing.Responsibility || '',
                    remarks: existing.Remarks || '',
                    imglink1: existing.imglink1 || null,
                    imglink2: existing.imglink2 || null,
                    imglink3: existing.imglink3 || null,
                    videolink: existing.videolink || null,
                    media: { images: [], video: null }
                  };
                }
                return item;
              })
            );
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error loading data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    if ((editMode && visitcode) || (pmsfData && pmsfData.length === 0)) {
      fetchData();
    }
  }, [editMode, visitcode, pmsfData]);

  // Search and filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsibility, setFilterResponsibility] = useState('');
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterActivity, setFilterActivity] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  
  // Floating button state
  const [buttonPosition, setButtonPosition] = useState(() => {
    const saved = localStorage.getItem('filterButtonPosition');
    return saved ? JSON.parse(saved) : { x: 20, y: 200 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  
  // Refs for dropdown click-outside detection
  const categoryDropdownRef = useRef(null);
  const activityDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close category dropdown
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
      // Close activity dropdown
      if (activityDropdownRef.current && !activityDropdownRef.current.contains(event.target)) {
        setShowActivityDropdown(false);
      }
      // Close filter panel if clicking outside of it and not on the button
      if (showFilters && buttonRef.current && !buttonRef.current.contains(event.target)) {
        // Check if click is not on any of the filter controls
        const filterSection = event.target.closest('.filter-controls');
        if (!filterSection) {
          setShowFilters(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  // Handle dragging the filter button
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - buttonPosition.x,
      y: e.clientY - buttonPosition.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep button within viewport
      const constrainedX = Math.max(0, Math.min(newX, window.innerWidth - 50));
      const constrainedY = Math.max(0, Math.min(newY, window.innerHeight - 50));
      
      setButtonPosition({ x: constrainedX, y: constrainedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem('filterButtonPosition', JSON.stringify({ 
        x: buttonPosition.x, 
        y: buttonPosition.y 
      }));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, buttonPosition]);

  // Get unique categories and activities for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(activitiesData.map(item => item.Category).filter(Boolean))];
    return categories.sort();
  }, [activitiesData]);

  const uniqueActivities = useMemo(() => {
    let filtered = activitiesData;
    
    // If categories are selected, filter activities to only those from selected categories
    if (filterCategory.length > 0) {
      filtered = activitiesData.filter(item => filterCategory.includes(item.Category));
    }
    
    const activities = [...new Set(filtered.map(item => item.Activity).filter(Boolean))];
    return activities.sort();
  }, [activitiesData, filterCategory]);

  // Toggle selection for multi-select filters
  const toggleCategoryFilter = (category) => {
    setFilterCategory(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    // Clear activity filter when categories change to avoid stale activity selections
    setFilterActivity([]);
  };

  const toggleActivityFilter = (activity) => {
    setFilterActivity(prev => 
      prev.includes(activity) 
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const getPreviousActivityByCode = (code) => {
    if (!previousEntry || !previousEntry.activities) return null;
    return previousEntry.activities.find(a => a.Code === code) || null;
  };

  const getPreviousStatusColor = (status) => {
    if (!status) return '#9e9e9e';
    if (status.toLowerCase() === 'yes') return '#64b84d';
    if (status.toLowerCase() === 'no') return '#c41e3a';
    if (status.toLowerCase() === 'na') return '#ffc107';
    return '#9e9e9e';
  };

  const handleShowPreviousActivity = (code) => {
    const prev = getPreviousActivityByCode(code);
    if (!prev) return;
    setSelectedPreviousActivity(prev);
    setShowPreviousModal(true);
  };

  // Filter activities based on filters
  const filteredActivities = useMemo(() => {
    return activitiesData.filter(activity => {
      // Search term filter (category or activity name)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (activity.Category || '').toLowerCase().includes(searchLower) ||
        (activity.Activity || '').toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = !filterStatus || activity.status === filterStatus;

      // Responsibility filter
      const matchesResponsibility = !filterResponsibility || 
        activity.responsibility === filterResponsibility;

      // Category filter (multiple)
      const matchesCategory = filterCategory.length === 0 || filterCategory.includes(activity.Category);

      // Activity filter (multiple)
      const matchesActivity = filterActivity.length === 0 || filterActivity.includes(activity.Activity);

      return matchesSearch && matchesStatus && matchesResponsibility && matchesCategory && matchesActivity;
    });
  }, [activitiesData, searchTerm, filterStatus, filterResponsibility, filterCategory, filterActivity]);

  const effectiveVisitDate = formData.visitDate ? new Date(formData.visitDate) : null;
  const effectiveVisitYear = formData.visitYear || (effectiveVisitDate ? effectiveVisitDate.getFullYear() : null);
  const effectiveVisitQuarter = formData.visitQuarter || (effectiveVisitDate ? Math.ceil((effectiveVisitDate.getMonth() + 1) / 3) : null);

  // Group activities by category
  const groupedByCategory = useMemo(() => {
    const groups = {};
    filteredActivities.forEach(activity => {
      const category = activity.Category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(activity);
    });
    return groups;
  }, [filteredActivities]);

  // Sort categories by first activity's indexing
  const sortedCategories = useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => {
      const indexA = groupedByCategory[a][0]?.Indexing || 0;
      const indexB = groupedByCategory[b][0]?.Indexing || 0;
      return indexA - indexB;
    });
  }, [groupedByCategory]);

  const handleActivityUpdate = (code, updatedActivity) => {
    setActivitiesData(prev =>
      prev.map(activity => (activity.Code === code ? updatedActivity : activity))
    );
  };

  const handleMediaAdd = (code, media) => {
    setActivitiesData(prev =>
      prev.map(activity =>
        activity.Code === code ? { ...activity, media } : activity
      )
    );
  };

  const handleMediaRemove = (code, media) => {
    setActivitiesData(prev =>
      prev.map(activity =>
        activity.Code === code ? { ...activity, media } : activity
      )
    );
  };

  const handleSubmitForm = async () => {
    if (isSubmitting) {
      return;
    }
    // Validate all activities before submission
    const validationErrors = [];

    activitiesData.forEach((activity, index) => {
      if (activity.status === 'No') {
        // If status is "No", responsibility and remarks are required
        if (!activity.responsibility || activity.responsibility.trim() === '') {
          validationErrors.push(`${activity.Category} - ${activity.Activity}: Responsibility is required when Status is "No"`);
        }
        if (!activity.remarks || activity.remarks.trim() === '') {
          validationErrors.push(`${activity.Category} - ${activity.Activity}: Remarks is required when Status is "No"`);
        }
      } else if (activity.status === 'Yes') {
        // If status is "Yes", responsibility should be blank
        if (activity.responsibility && activity.responsibility.trim() !== '') {
          validationErrors.push(`${activity.Category} - ${activity.Activity}: Responsibility must be empty when Status is "Yes"`);
        }
      }
    });

    // If there are validation errors, show them
    if (validationErrors.length > 0) {
      alert('Please fix the following validation errors:\n\n' + validationErrors.join('\n'));
      return;
    }

    // Prompt for Approved by OM/BM (only if not in edit mode)
    let approvedBy = formData.approvedBy || '';
    if (!editMode) {
      approvedBy = prompt('Please enter Approved By OM/BM:');
      
      if (approvedBy === null) {
        // User cancelled
        return;
      }
      
      if (!approvedBy || approvedBy.trim() === '') {
        alert('Approved By OM/BM field is required!');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Upload media files for each activity before submitting form
      const activitiesWithMedia = [];
      
      for (const activity of activitiesData) {
        const activityData = {
          code: activity.Code,
          masterCat: activity.MasterCat,
          category: activity.Category,
          activity: activity.Activity,
          remarks: activity.remarks || '',
          weightage: activity.Weightage,
          vStatus: activity.status || activity.V_Status || 'NA',
          responsibility: activity.responsibility || '',
          indexing: activity.Indexing
        };

        // If activity has media, upload it
        if (activity.media && (activity.media.images?.length > 0 || activity.media.video)) {
          const formData = new FormData();
          
          // Add images (they are File objects from ActivityCard)
          if (activity.media.images && activity.media.images.length > 0) {
            for (let i = 0; i < activity.media.images.length; i++) {
              const imageFile = activity.media.images[i];
              formData.append('files', imageFile, imageFile.name);
            }
          }

          // Add video (it's a File object from ActivityCard)
          if (activity.media.video) {
            const videoFile = activity.media.video;
            formData.append('files', videoFile, videoFile.name);
          }

          // Add metadata for proper filename generation
          const uploadDate = formData.visitDate ? new Date(formData.visitDate) : new Date();
          const uploadYear = uploadDate.getFullYear();
          const uploadQuarter = Math.ceil((uploadDate.getMonth() + 1) / 3);

          formData.append('activityCode', activity.Code);
          formData.append('branchCode', formData.branchCode || '');
          formData.append('visitYear', uploadYear);
          formData.append('visitQuarter', uploadQuarter);

          // Upload files
          const uploadResponse = await fetch('/api/upload-media', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) {
            throw new Error(`File upload failed for activity ${activity.Code}`);
          }

          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success && uploadResult.files) {
            // Separate uploaded files into images and videos based on file extensions
            const files = uploadResult.files;
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
            const videoExtensions = ['.mp4', '.avi', '.mov', '.webm'];
            
            const images = [];
            const videos = [];
            
            files.forEach(filename => {
              const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
              if (imageExtensions.includes(ext)) {
                images.push(filename);
              } else if (videoExtensions.includes(ext)) {
                videos.push(filename);
              }
            });
            
            activityData.imglink1 = images[0] || null;
            activityData.imglink2 = images[1] || null;
            activityData.imglink3 = images[2] || null;
            activityData.videolink = videos[0] || null;
          }
        }

        activitiesWithMedia.push(activityData);
      }

      // Prepare form submission data
      const submissionData = editMode ? {
        visitcode: visitcode,
        activities: activitiesWithMedia
      } : {
        formInfo: {
          branchCode: formData.branchCode,
          branchName: formData.branchName,
          division: formData.division,
          region: formData.region,
          area: formData.area,
          visitOfficerName: formData.visitOfficerName,
          visitDate: formData.visitDate,
          approvedBy: approvedBy.trim()
        },
        activities: activitiesWithMedia
      };

      // Send to backend
      const endpoint = editMode ? '/api/update-pmsf-form' : '/api/submit-pmsf-form';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage = errorBody?.message || response.statusText || 'Server error';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        alert(editMode ? 'Form updated successfully!' : 'Form submitted successfully!');
        navigate(-1); // Go back to entry module
      } else {
        alert(`${editMode ? 'Update' : 'Submission'} failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert(`Error submitting form: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    // TODO: Save draft
    console.log('Saving draft:', activitiesData);
    alert('Draft saved! (Implementation pending)');
  };

  if (loading) {
    return (
      <div className="pmsf-form-container">
        <div className="pmsf-form-header">
          <p style={{ fontSize: '18px', textAlign: 'center', marginTop: '40px' }}>Loading existing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pmsf-form-container">
      <div className="pmsf-form-header">
        <button className="btn-back-pmsf" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-content">
          <h1 className="pmsf-form-title">
            {editMode ? 'Edit Module' : 'PMSF Evaluation Form'}
          </h1>
          <p className="pmsf-form-subtitle">
            Branch: {formData.branchName} ({formData.branchCode})
          </p>
        </div>
      </div>

      {/* Previous Quarter Entry Comparison Component */}
      <PreviousQuarterComparison 
        branchCode={formData.branchCode}
        visitYear={effectiveVisitYear}
        visitQuarter={effectiveVisitQuarter}
        allActivitiesData={activitiesData}
        showSummary={true}
        onPreviousEntryLoaded={setPreviousEntry}
      />

      {/* Search and Filter Section */}
      <div className="search-filter-section">
        <button 
          ref={buttonRef}
          className={`filter-toggle-btn ${isDragging ? 'dragging' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          onMouseDown={handleMouseDown}
          title="Toggle filters (drag to move)"
          style={{
            position: 'fixed',
            left: `${buttonPosition.x}px`,
            top: `${buttonPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            zIndex: 999
          }}
        >
          🔍
        </button>

        {showFilters && (
          <div className="filter-controls" style={{ position: 'fixed', left: `${buttonPosition.x + 50}px`, top: `${buttonPosition.y}px`, zIndex: 998 }}>
          <div className="multi-select-filter" ref={categoryDropdownRef}>
            <button 
              className="dropdown-toggle"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              Categories ({filterCategory.length} selected) 
              <span className="dropdown-arrow">{showCategoryDropdown ? '▲' : '▼'}</span>
            </button>
            {showCategoryDropdown && (
              <div className="checkbox-group">
                {uniqueCategories.map(category => (
                  <label key={category} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filterCategory.includes(category)}
                      onChange={() => toggleCategoryFilter(category)}
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="multi-select-filter" ref={activityDropdownRef}>
            <button 
              className="dropdown-toggle"
              onClick={() => setShowActivityDropdown(!showActivityDropdown)}
            >
              Activities ({filterActivity.length} selected)
              <span className="dropdown-arrow">{showActivityDropdown ? '▲' : '▼'}</span>
            </button>
            {showActivityDropdown && (
              <div className="checkbox-group">
                {uniqueActivities.map(activity => (
                  <label key={activity} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={filterActivity.includes(activity)}
                      onChange={() => toggleActivityFilter(activity)}
                    />
                    <span>{activity}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="NA">NA</option>
          </select>

          <select
            className="filter-select"
            value={filterResponsibility}
            onChange={(e) => setFilterResponsibility(e.target.value)}
          >
            <option value="">All Responsibility</option>
            <option value="Admin">Admin</option>
            <option value="IT">IT</option>
            <option value="Branch Ops">Branch Ops</option>
            <option value="Marketing">Marketing</option>
            <option value="HR">HR</option>
            <option value="Business">Business</option>
          </select>

          {(searchTerm || filterStatus || filterResponsibility || filterCategory.length > 0 || filterActivity.length > 0) && (
            <button 
              className="clear-all-btn"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
                setFilterResponsibility('');
                setFilterCategory([]);
                setFilterActivity([]);
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
        )}
      </div>

      <div className="pmsf-form-content">{sortedCategories.map(category => (
          <div key={category} className="category-section">
            <div className="category-sticky-header">
              <h2 className="category-title">{category}</h2>
              <span className="category-item-count">
                {groupedByCategory[category].length} items
              </span>
            </div>

            <div className="activities-grid">
              {groupedByCategory[category].map(activity => (
                <ActivityCard
                  key={activity.Code}
                  activity={activity}
                  onActivityUpdate={handleActivityUpdate}
                  onMediaAdd={handleMediaAdd}
                  onMediaRemove={handleMediaRemove}
                  previousActivity={getPreviousActivityByCode(activity.Code)}
                  previousStatusColor={getPreviousStatusColor(getPreviousActivityByCode(activity.Code)?.V_Status)}
                  onShowPrevious={() => handleShowPreviousActivity(activity.Code)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pmsf-form-footer">
        <button className="btn-save-draft" onClick={handleSaveDraft} disabled={isSubmitting}>
          💾 Save Draft
        </button>
        <button className="btn-submit-form" onClick={handleSubmitForm} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : '✓ Submit Form'}
        </button>
      </div>

      {showPreviousModal && selectedPreviousActivity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#333' }}>Previous Entry Details</h2>
              <button
                onClick={() => {
                  setShowPreviousModal(false);
                  setSelectedPreviousActivity(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Activity</h3>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  {selectedPreviousActivity.Activity}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Previous Status</h3>
                <span style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  color: getPreviousStatusColor(selectedPreviousActivity.V_Status),
                  fontWeight: 'bold',
                  fontSize: '32px',
                  lineHeight: '1'
                }}>
                  {selectedPreviousActivity.V_Status === 'Yes' ? '✓' : selectedPreviousActivity.V_Status === 'No' ? '✗' : selectedPreviousActivity.V_Status || 'N/A'}
                </span>
              </div>

              {selectedPreviousActivity.Responsibility && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Responsibility</h3>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    {selectedPreviousActivity.Responsibility}
                  </p>
                </div>
              )}

              {selectedPreviousActivity.Remarks && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Remarks</h3>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    {selectedPreviousActivity.Remarks}
                  </p>
                </div>
              )}

              {(selectedPreviousActivity.imglink1 || selectedPreviousActivity.imglink2 || selectedPreviousActivity.imglink3) && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Images</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[selectedPreviousActivity.imglink1, selectedPreviousActivity.imglink2, selectedPreviousActivity.imglink3].map((img, idx) => (
                      img && (
                        <div key={idx} style={{
                          width: '100%',
                          height: '80px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          <img
                            src={`http://localhost:5000/images/${img}`}
                            alt={`Image ${idx + 1}`}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {selectedPreviousActivity.videolink && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Video</h3>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    Video: {selectedPreviousActivity.videolink}
                  </p>
                </div>
              )}

              <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginTop: '20px', fontSize: '13px', color: '#666' }}>
                <strong>Note:</strong> No changes allowed for previous data. This is for reference only.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
