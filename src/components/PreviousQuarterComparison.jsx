import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PreviousQuarterComparison({
  branchCode,
  visitYear,
  visitQuarter,
  allActivitiesData,
  showSummary = true,
  showActivitiesSection = true,
  headingText = 'Previous Quarter Entry',
  onPreviousEntryLoaded
}) {
  const [previousEntry, setPreviousEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNegativeList, setShowNegativeList] = useState(false);

  useEffect(() => {
    if (branchCode && visitYear && visitQuarter) {
      fetchPreviousEntry();
    }
  }, [branchCode, visitYear, visitQuarter]);

  const fetchPreviousEntry = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/previous-quarter/${branchCode}/${visitYear}/${visitQuarter}`
      );
      
      if (response.data.success && response.data.previousEntry) {
        setPreviousEntry(response.data.previousEntry);
        if (onPreviousEntryLoaded) {
          onPreviousEntryLoaded(response.data.previousEntry);
        }
      } else if (onPreviousEntryLoaded) {
        onPreviousEntryLoaded(null);
      }
    } catch (error) {
      console.log('No previous quarter entry:', error.message);
      if (onPreviousEntryLoaded) {
        onPreviousEntryLoaded(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPreviousActivityStatus = (code) => {
    if (!previousEntry?.activities) return null;
    const activity = previousEntry.activities.find(a => a.Code === code);
    return activity ? activity.V_Status : null;
  };

  const getPreviousActivityDetails = (code) => {
    if (!previousEntry?.activities) return null;
    return previousEntry.activities.find(a => a.Code === code) || null;
  };

  const getStatusColor = (status) => {
    if (!status) return '#9e9e9e';
    if (status.toLowerCase() === 'yes') return '#64b84d';
    if (status.toLowerCase() === 'no') return '#c41e3a';
    if (status.toLowerCase() === 'na') return '#ffc107';
    return '#9e9e9e';
  };

  if (!showSummary) {
    return null;
  }

  if (!previousEntry) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        border: '2px solid #ced4da',
        borderRadius: '8px',
        padding: '20px',
        margin: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>{headingText}</h3>
        <p style={{ margin: 0, color: '#6c757d' }}>No previous quarter entry found for this branch.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ 
        background: 'linear-gradient(135deg, #fff3cd 0%, #ffe5b4 100%)',
        border: '2px solid #ffc107',
        borderRadius: '8px',
        padding: '20px',
        margin: '20px',
        marginBottom: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#856404' }}>{headingText}</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '15px'
        }}>
          <div>
            <strong>Visit Date:</strong> {new Date(previousEntry.visitDate).toLocaleDateString()}
          </div>
          <div>
            <strong>Visited By:</strong> {previousEntry.visitedBy}
          </div>
          <div>
            <strong>Score:</strong> {previousEntry.score ? previousEntry.score.toFixed(2) : 'N/A'}%
          </div>
        </div>
        
        {showActivitiesSection && (
          <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Activities with Negative status in last visit</strong>
            {allActivitiesData.filter(activity => {
              const prevStatus = getPreviousActivityStatus(activity.Code);
              return prevStatus && prevStatus.toLowerCase() === 'no';
            }).length > 0 && (
              <button
                type="button"
                onClick={() => setShowNegativeList(prev => !prev)}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#c41e3a',
                  cursor: 'pointer',
                  border: '1px solid #c41e3a',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  background: 'transparent'
                }}
              >
                Show all <span style={{ fontSize: '12px' }}>▼</span>
              </button>
            )}
          </div>

          {allActivitiesData.filter(activity => {
            const prevStatus = getPreviousActivityStatus(activity.Code);
            return prevStatus && prevStatus.toLowerCase() === 'no';
          }).length === 0 && (
            <p style={{ fontSize: '14px', color: '#856404', fontStyle: 'italic', marginTop: '10px' }}>
              No activities with "No" status found in previous quarter.
            </p>
          )}

          {showNegativeList && (
            <div style={{
              marginTop: '10px',
              backgroundColor: '#fff',
              border: '2px solid #c41e3a',
              borderRadius: '6px',
              padding: '10px'
            }}>
              {allActivitiesData.filter(activity => {
                const prevStatus = getPreviousActivityStatus(activity.Code);
                return prevStatus && prevStatus.toLowerCase() === 'no';
              }).map(activity => (
                <button
                  key={activity.Code}
                  type="button"
                  onClick={() => {
                    const details = getPreviousActivityDetails(activity.Code);
                    if (details) {
                      setSelectedActivity(details);
                      setShowModal(true);
                    }
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 0',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: '1px solid #eee',
                    color: '#333',
                    cursor: 'pointer'
                  }}
                >
                  {activity.Activity}
                </button>
              ))}
            </div>
          )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedActivity && (
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
                  setShowModal(false);
                  setSelectedActivity(null);
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
                  {selectedActivity.Activity}
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Previous Status</h3>
                <span style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  color: getStatusColor(selectedActivity.V_Status),
                  fontWeight: 'bold',
                  fontSize: '24px',
                  lineHeight: '1'
                }}>
                  {selectedActivity.V_Status === 'Yes' ? '✓' : selectedActivity.V_Status === 'No' ? '✗' : selectedActivity.V_Status || 'N/A'}
                </span>
              </div>

              {selectedActivity.Responsibility && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Responsibility</h3>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    {selectedActivity.Responsibility}
                  </p>
                </div>
              )}

              {selectedActivity.Remarks && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Remarks</h3>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                    {selectedActivity.Remarks}
                  </p>
                </div>
              )}

              {(selectedActivity.imglink1 || selectedActivity.imglink2 || selectedActivity.imglink3) && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Images</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[selectedActivity.imglink1, selectedActivity.imglink2, selectedActivity.imglink3].map((img, idx) => (
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

              {selectedActivity.videolink && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#555' }}>Video</h3>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    Video: {selectedActivity.videolink}
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
    </>
  );
}
