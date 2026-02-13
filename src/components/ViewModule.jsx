import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BranchInformation from './BranchInformation';
import Button from './Button';
import FormSelect from './FormSelect';
import Modal from './Modal';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import '../styles/ViewModule.css';

export default function ViewModule() {
  const navigate = useNavigate();
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentQtr = Math.ceil(currentMonth / 3);

  // Helper function to format month number to text
  const formatMonth = (monthNum) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1] || '';
  };

  // Form state
  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    division: '',
    region: '',
    area: '',
    year: currentYear,
    qtr: currentQtr
  });

  // Image preview modal
  const [imageModal, setImageModal] = useState({ isOpen: false, imagePath: '' });
  const [expandedActivities, setExpandedActivities] = useState({});

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterResponsibility, setFilterResponsibility] = useState('');
  const [buttonPosition, setButtonPosition] = useState(() => {
    const saved = localStorage.getItem('viewFilterButtonPosition');
    return saved ? JSON.parse(saved) : { x: 20, y: 200 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  const openImageModal = (imagePath) => {
    setImageModal({ isOpen: true, imagePath });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imagePath: '' });
  };

  const toggleActivity = (segment, category, idx) => {
    const key = `${segment}-${category}-${idx}`;
    setExpandedActivities(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Drag functionality for filter button
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - buttonPosition.x,
      y: e.clientY - buttonPosition.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setButtonPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('viewFilterButtonPosition', JSON.stringify(buttonPosition));
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, buttonPosition]);

  const [viewData, setViewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewed, setViewed] = useState(false);
  const [previousVisit, setPreviousVisit] = useState(null);
  const [previousVisitLoading, setPreviousVisitLoading] = useState(false);

  // Handle branch data change from BranchInformation component
  const handleBranchDataChange = useCallback((data) => {
    if (data) {
      setFormData(prev => ({
        ...prev,
        branchCode: data.branchCode,
        branchName: data.branchName,
        division: data.division,
        region: data.region,
        area: data.area
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        branchCode: '',
        branchName: '',
        division: '',
        region: '',
        area: ''
      }));
    }
    setViewData(null);
    setError('');
    setViewed(false);
    setPreviousVisit(null);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchPreviousVisit = async () => {
      setPreviousVisitLoading(true);
      try {
        const response = await axios.get(
          `/api/previous-quarter/${formData.branchCode}/${formData.year}/${formData.qtr}`
        );
        if (!isActive) return;
        setPreviousVisit(response.data.previousEntry || null);
      } catch (err) {
        if (!isActive) return;
        setPreviousVisit(null);
      } finally {
        if (!isActive) return;
        setPreviousVisitLoading(false);
      }
    };

    if (viewData && viewed && viewData.success && formData.branchCode && formData.year && formData.qtr) {
      fetchPreviousVisit();
    } else {
      setPreviousVisit(null);
    }

    return () => {
      isActive = false;
    };
  }, [viewData, viewed, formData.branchCode, formData.year, formData.qtr]);

  // Handle year change
  const handleYearChange = (e) => {
    setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }));
    setViewData(null);
    setError('');
    setViewed(false);
  };

  // Handle quarter change
  const handleQtrChange = (e) => {
    setFormData(prev => ({ ...prev, qtr: parseInt(e.target.value) }));
    setViewData(null);
    setError('');
    setViewed(false);
  };

  // Handle view submit
  const handleView = async (e) => {
    e.preventDefault();

    if (!formData.branchCode || formData.branchCode.length < 3) {
      setError('Please select a valid branch');
      return;
    }

    setLoading(true);
    setError('');
    setViewData(null);
    setViewed(false);

    try {
      const response = await axios.get(
        `http://${window.location.hostname}:5000/api/visit-data/${formData.branchCode}/${formData.year}/${formData.qtr}`
      );

      if (response.data.success) {
        setViewData(response.data);
        setViewed(true);
      } else {
        setError(response.data.message || 'No data found');
        setViewed(true);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch data';
      setError(errorMsg);
      setViewed(true);
    } finally {
      setLoading(false);
    }
  };

  // Calculate score for a set of activities
  const calculateScore = (activities) => {
    let totalResult = 0;
    let totalWeightage = 0;

    activities.forEach(activity => {
      if (activity.V_Status && activity.V_Status !== 'NA') {
        totalResult += activity.Result || 0;
        totalWeightage += activity.Weightage || 0;
      }
    });

    if (totalWeightage === 0) return 0;
    return ((totalResult / totalWeightage) * 100).toFixed(2);
  };

  // Check if activity was "No" in previous quarter
  const wasPreviouslyNo = (code) => {
    if (!previousEntry || !previousEntry.activities) return false;
    const prevActivity = previousEntry.activities.find(a => a.Code === code);
    return prevActivity && prevActivity.V_Status?.toLowerCase() === 'no';
  };

  // Group ALL activities by Master Cat (Segment) first, then by Category (unfiltered for score calculation)
  const allGroupedBySegment = useMemo(() => {
    if (!viewData?.activities) return {};
    
    const segments = {};
    viewData.activities.forEach(activity => {
      const segment = activity.MasterCat || 'Uncategorized';
      if (!segments[segment]) {
        segments[segment] = {};
      }
      
      const category = activity.Category || 'Uncategorized';
      if (!segments[segment][category]) {
        segments[segment][category] = [];
      }
      segments[segment][category].push(activity);
    });
    return segments;
  }, [viewData?.activities]);

  // Group FILTERED activities for display purposes only
  const groupedBySegment = useMemo(() => {
    if (!viewData?.activities) return {};
    
    // Apply filters
    let filteredActivities = viewData.activities;
    
    // Filter by status
    if (filterStatus) {
      filteredActivities = filteredActivities.filter(activity => 
        activity.V_Status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }
    
    // Filter by responsibility
    if (filterResponsibility) {
      filteredActivities = filteredActivities.filter(activity => 
        activity.Responsibility === filterResponsibility
      );
    }
    
    const segments = {};
    filteredActivities.forEach(activity => {
      const segment = activity.MasterCat || 'Uncategorized';
      if (!segments[segment]) {
        segments[segment] = {};
      }
      
      const category = activity.Category || 'Uncategorized';
      if (!segments[segment][category]) {
        segments[segment][category] = [];
      }
      segments[segment][category].push(activity);
    });
    return segments;
  }, [viewData?.activities, filterStatus, filterResponsibility]);

  // Sort segments by first activity's indexing (use all data for consistent ordering)
  const sortedSegments = useMemo(() => {
    return Object.keys(allGroupedBySegment).sort((a, b) => {
      const indexA = Math.min(...Object.values(allGroupedBySegment[a]).flat().map(act => act.Indexing || 0));
      const indexB = Math.min(...Object.values(allGroupedBySegment[b]).flat().map(act => act.Indexing || 0));
      return indexA - indexB;
    });
  }, [allGroupedBySegment]);

  // Calculate segment scores (ALWAYS based on ALL data, not filtered)
  const segmentScores = useMemo(() => {
    const scores = {};
    Object.keys(allGroupedBySegment).forEach(segment => {
      const allActivities = Object.values(allGroupedBySegment[segment]).flat();
      scores[segment] = calculateScore(allActivities);
    });
    return scores;
  }, [allGroupedBySegment]);

  // Calculate category scores for each segment (ALWAYS based on ALL data, not filtered)
  const categoryScores = useMemo(() => {
    const scores = {};
    Object.keys(allGroupedBySegment).forEach(segment => {
      scores[segment] = {};
      Object.keys(allGroupedBySegment[segment]).forEach(category => {
        const activities = allGroupedBySegment[segment][category];
        scores[segment][category] = calculateScore(activities);
      });
    });
    return scores;
  }, [allGroupedBySegment]);

  return (
    <div className="view-module-container">
      <div className="view-module-wrapper">
        <Button 
          variant="back" 
          onClick={() => navigate('/')}
          icon="←"
          className="btn-back-view"
        >
          Back to Home
        </Button>

        <div className="view-module-header">
          <h1 className="view-module-title">View Visit Data</h1>
          <div className="waving-banner">
            <div className="banner-pole"></div>
            <div className="banner-flag">
              <span>Service & Quality</span>
            </div>
          </div>
          <p className="view-module-subtitle">Search and view submitted visit records</p>
        </div>

        <div className="view-module-card">
          <form className="view-form" onSubmit={handleView}>
            {/* Combined Branch Information and Period Selection */}
            <div className="combined-form-section">
              {/* Branch Information Component */}
              <BranchInformation onBranchDataChange={handleBranchDataChange} />

              {/* Year and Quarter Selection */}
              <div className="period-selection-section">
                <h2 className="section-title">Period Selection</h2>
                
                <div className="period-inputs">
                  <FormSelect
                    label="Year"
                    id="year"
                    value={formData.year}
                    onChange={handleYearChange}
                    options={[currentYear - 1, currentYear, currentYear + 1]}
                    required
                  />

                  <FormSelect
                    label="Quarter"
                    id="qtr"
                    value={formData.qtr}
                    onChange={handleQtrChange}
                    options={[
                      { value: 1, label: 'Q1 (Jan-Mar)' },
                      { value: 2, label: 'Q2 (Apr-Jun)' },
                      { value: 3, label: 'Q3 (Jul-Sep)' },
                      { value: 4, label: 'Q4 (Oct-Dec)' }
                    ]}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && viewed && (
              <ErrorMessage 
                message={error}
                type="error"
                onDismiss={() => setError('')}
              />
            )}

            <div className="form-actions">
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading}
                loading={loading}
                className="btn-view"
              >
                View Data
              </Button>
            </div>
          </form>
        </div>

        {/* View Results Section */}
        {viewData && viewed && viewData.success && (
          <div className="view-results-container">
            <div className="view-results-header">
              <h2>Visit Summary</h2>
              <Button 
                variant="back"
                onClick={() => setViewData(null)}
                icon="←"
                className="btn-back-view"
              >
                Back to Search
              </Button>
            </div>

            {/* Visit Summary Card */}
            <div className="visit-summary-card">
              <div className="summary-row">
                <div className="summary-item">
                  <label>Branch Code</label>
                  <span>{viewData.visit.BranchCode}</span>
                </div>
                <div className="summary-item">
                  <label>Branch Name</label>
                  <span>{viewData.visit.BranchName}</span>
                </div>
                <div className="summary-item">
                  <label>Division</label>
                  <span>{viewData.visit.Division}</span>
                </div>
                <div className="summary-item">
                  <label>Region</label>
                  <span>{viewData.visit.Region}</span>
                </div>
              </div>

              <div className="summary-row">
                <div className="summary-item">
                  <label>Area</label>
                  <span>{viewData.visit.Area}</span>
                </div>
                <div className="summary-item">
                  <label>Visit Date</label>
                  <span>{new Date(viewData.visit.VisitDateTime).toLocaleDateString()}</span>
                </div>
                <div className="summary-item">
                  <label>Month</label>
                  <span>{formatMonth(viewData.visit.Month)}</span>
                </div>
                <div className="summary-item">
                  <label>Quarter</label>
                  <span>Q{viewData.visit.Quarter}</span>
                </div>
              </div>

              <div className="summary-row">
                <div className="summary-item">
                  <label>Year</label>
                  <span>{viewData.visit.Year}</span>
                </div>
                <div className="summary-item">
                  <label>Visited By</label>
                  <span>{viewData.visit.VisitBy}</span>
                </div>
                <div className="summary-item">
                  <label>Approved By</label>
                  <span>{viewData.visit.ApprovedBy_OM_BM || 'N/A'}</span>
                </div>
                <div className="summary-item">
                  <label>Overall Score</label>
                  <span className="score-badge">{viewData.visit.Score}%</span>
                </div>
              </div>

              <div style={{ margin: '6px 0 10px', fontWeight: 700, color: '#555' }}>
                Previous Visit Details
              </div>
              <div className="summary-row">
                <div className="summary-item">
                  <label>Previous Visit Date</label>
                  <span>
                    {previousVisitLoading
                      ? 'Loading...'
                      : previousVisit?.visitDate
                        ? new Date(previousVisit.visitDate).toLocaleDateString()
                        : 'N/A'}
                  </span>
                </div>
                <div className="summary-item">
                  <label>Previous Visited By</label>
                  <span>
                    {previousVisitLoading
                      ? 'Loading...'
                      : previousVisit?.visitedBy || 'N/A'}
                  </span>
                </div>
                <div className="summary-item">
                  <label>Previous Score</label>
                  <span className="score-badge">
                    {previousVisitLoading
                      ? 'Loading...'
                      : previousVisit?.score != null
                        ? `${previousVisit.score.toFixed(2)}%`
                        : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Section */}
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
                <div className="filter-controls" style={{ 
                  position: 'fixed', 
                  left: `${buttonPosition.x + 50}px`, 
                  top: `${buttonPosition.y}px`, 
                  zIndex: 998 
                }}>
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

                  {(filterStatus || filterResponsibility) && (
                    <button 
                      className="clear-all-btn"
                      onClick={() => {
                        setFilterStatus('');
                        setFilterResponsibility('');
                      }}
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Score Summary Section */}
            <div className="score-summary-section">
              <h3>Score Summary by Segment</h3>
              <div className="segment-scores-container">
                {sortedSegments.map(segment => (
                  <div key={segment} className="segment-score-card">
                    <div className="segment-score-header">
                      <span className="segment-name">{segment}</span>
                      <span className="segment-score-badge">{segmentScores[segment]}%</span>
                    </div>
                    
                    {/* Category scores within segment */}
                    <div className="category-scores">
                      {Object.keys(allGroupedBySegment[segment]).sort((a, b) => {
                        const indexA = Math.min(...(allGroupedBySegment[segment][a]?.map(act => act.Indexing || 0) || [0]));
                        const indexB = Math.min(...(allGroupedBySegment[segment][b]?.map(act => act.Indexing || 0) || [0]));
                        return indexA - indexB;
                      }).map(category => (
                        <div key={category} className="category-score-item">
                          <span className="category-name">{category}</span>
                          <span className="category-score-value">{categoryScores[segment][category]}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activities Section */}
            <div className="view-activities-section">
              <h3>Activity Details</h3>
              <div className="activities-container">
                {sortedSegments.map(segment =>
                  groupedBySegment[segment] && Object.keys(groupedBySegment[segment]).sort((a, b) => {
                    const indexA = Math.min(...(groupedBySegment[segment][a]?.map(act => act.Indexing || 0) || [0]));
                    const indexB = Math.min(...(groupedBySegment[segment][b]?.map(act => act.Indexing || 0) || [0]));
                    return indexA - indexB;
                  }).map(category => (
                    <div key={category} className="category-section">
                      <h5 className="view-category-title">{category}</h5>
                      <div className="activities-list">
                        {groupedBySegment[segment][category].map((activity, idx) => {
                          const activityKey = `${segment}-${category}-${idx}`;
                          const isExpanded = expandedActivities[activityKey];
                          return (
                          <div key={idx} className={`activity-item ${activity.V_Status?.toLowerCase() === 'no' ? 'activity-no' : ''}`}>
                            <div 
                              className="activity-header" 
                              onClick={() => toggleActivity(segment, category, idx)}
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="activity-name">{activity.Activity}</span>
                              <span className={`status-badge status-${activity.V_Status?.toLowerCase()}`}>
                                {activity.V_Status?.toLowerCase() === 'yes' && '✓'}
                                {activity.V_Status?.toLowerCase() === 'no' && '✗'}
                                {activity.V_Status?.toLowerCase() === 'na' && 'NA'}
                              </span>
                            </div>

                            {isExpanded && (activity.Responsibility || activity.Remarks) && (
                              <div className="activity-notes">
                                {activity.Responsibility && (
                                  <div className="note">
                                    <strong>Responsibility:</strong> {activity.Responsibility}
                                  </div>
                                )}
                                {activity.Remarks && (
                                  <div className="note">
                                    <strong>Remarks:</strong> {activity.Remarks}
                                  </div>
                                )}
                              </div>
                            )}

                            {isExpanded && (activity.imglink1 || activity.imglink2 || activity.imglink3 || activity.videolink) && (
                              <div className="activity-media">
                                {(activity.imglink1 || activity.imglink2 || activity.imglink3) && (
                                  <div className="media-images">
                                    <strong>Images:</strong>
                                    <div className="image-previews">
                                      {activity.imglink1 && (
                                        <img 
                                          src={`http://${window.location.hostname}:5000/images/${activity.imglink1}`}
                                          alt="Image 1"
                                          className="preview-thumbnail"
                                          onClick={() => openImageModal(activity.imglink1)}
                                        />
                                      )}
                                      {activity.imglink2 && (
                                        <img 
                                          src={`http://${window.location.hostname}:5000/images/${activity.imglink2}`}
                                          alt="Image 2"
                                          className="preview-thumbnail"
                                          onClick={() => openImageModal(activity.imglink2)}
                                        />
                                      )}
                                      {activity.imglink3 && (
                                        <img 
                                          src={`http://${window.location.hostname}:5000/images/${activity.imglink3}`}
                                          alt="Image 3"
                                          className="preview-thumbnail"
                                          onClick={() => openImageModal(activity.imglink3)}
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                                {activity.videolink && (
                                  <div className="media-video">
                                    <strong>Video:</strong>
                                    <span className="media-badge">🎥 {activity.videolink}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <Modal
        isOpen={imageModal.isOpen}
        onClose={closeImageModal}
        title="Image Preview"
        size="large"
      >
        <img 
          src={`http://${window.location.hostname}:5000/images/${imageModal.imagePath}`}
          alt="Full size preview"
          style={{ width: '100%', height: 'auto' }}
        />
      </Modal>
    </div>
  );
}

