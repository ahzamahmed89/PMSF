import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BranchInformation from './BranchInformation';
import VisitDate from './VisitDate';
import VisitOfficerApproval from './VisitOfficerApproval';
import '../styles/EntryModule.css';

export default function EntryModule() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // Form state
  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    division: '',
    region: '',
    area: '',
    visitOfficerName: 'User',
    visitDate: today,
    approvedBy: ''
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pmsfData, setPmsfData] = useState(null);

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
    setPmsfData(null);
    setSubmitError('');
  }, []);

  // Handle form submission - check visit and generate form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.branchCode || formData.branchCode.length < 3) {
      setSubmitError('Please enter a valid branch code');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');

    try {
      // Calculate quarter, month, year from visitDate
      const visitDateObj = new Date(formData.visitDate);
      const visitYear = visitDateObj.getFullYear();
      const visitMonth = visitDateObj.getMonth() + 1;
      const visitQuarter = Math.ceil(visitMonth / 3);

      const response = await axios.get(
        `http://${window.location.hostname}:5000/api/check-visit/${formData.branchCode}`,
        {
          params: {
            visitDate: formData.visitDate,
            visitMonth: visitMonth,
            visitQuarter: visitQuarter,
            visitYear: visitYear
          }
        }
      );

      setPmsfData(response.data.pmsfData);
      setSubmitError('');

      // Check if new entry is allowed
      if (response.data.existingVisit && !response.data.visitAllowed) {
        // Entry exists and new entries are not allowed for this period
        setSubmitError(`❌ ${response.data.message}`);
        return;
      }

      // Check if visit already exists and can be edited
      if (response.data.existingVisit && !response.data.canEdit) {
        // Entry exists but cannot be edited
        setSubmitError(`❌ ${response.data.message}`);
        return;
      }

      if (response.data.existingVisit && response.data.canEdit) {
        // Entry exists and can be edited - show confirmation
        const confirmEdit = window.confirm(
          `${response.data.message}\n\nEntry: ${response.data.existingVisit.visitDateTime}\n\nWould you like to edit this data?`
        );

        if (!confirmEdit) {
          setSubmitError('Form generation cancelled.');
          return;
        }

        // User wants to edit - navigate to PMSF form in edit mode
        setTimeout(() => {
          navigate('/pmsf-form', {
            state: {
              pmsfData: response.data.pmsfData,
              formData: {
                ...formData,
                visitYear: visitYear,
                visitQuarter: visitQuarter
              },
              editMode: true,
              visitcode: response.data.existingVisit.visitcode
            }
          });
        }, 500);
        return;
      }

      // No existing visit - create new form
      console.log('PMSF Data ready for form generation:', response.data);
      
      setTimeout(() => {
        navigate('/pmsf-form', {
          state: {
            pmsfData: response.data.pmsfData,
            formData: {
              ...formData,
              visitYear: visitYear,
              visitQuarter: visitQuarter
            },
            editMode: false
          }
        });
      }, 500);
      
    } catch (error) {
      if (error.response?.status === 409) {
        // Visit already exists
        const existingVisit = error.response.data;
        setSubmitError(`❌ ${existingVisit.message}`);
      } else {
        setSubmitError(error.response?.data?.error || 'Failed to generate form');
      }
      setPmsfData(null);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle form reset
  const handleReset = (e) => {
    e.preventDefault();
    setFormData({
      branchCode: '',
      branchName: '',
      division: '',
      region: '',
      area: '',
      visitOfficerName: 'User',
      visitDate: today,
      approvedBy: ''
    });
    setPmsfData(null);
    setSubmitError('');
  };

  return (
    <div className="entry-module-container">
      <div className="entry-module-wrapper">
        <button className="btn-back-entry" onClick={() => navigate('/')}>
          ← Back to Home
        </button>

        <div className="entry-module-header">
          <h1 className="entry-module-title">Entry Module</h1>
          <div className="waving-banner">
            <div className="banner-pole"></div>
            <div className="banner-flag">
              <span>Physical Mystery Shopping</span>
            </div>
          </div>
          <p className="entry-module-subtitle">Visit Entry Form</p>
        </div>

        <div className="entry-module-card">
          <form className="entry-form" onSubmit={handleSubmit} onReset={handleReset}>
            {/* Branch Information Component */}
            <BranchInformation onBranchDataChange={handleBranchDataChange} />

            {/* Visit Details Section */}
            <div className="form-section">
              <h2 className="section-title">Visit Details</h2>
              
              <div className="form-row">
                <VisitOfficerApproval
                  visitOfficerName={formData.visitOfficerName}
                  approvedBy={formData.approvedBy}
                  onOfficerNameChange={(value) => setFormData(prev => ({ ...prev, visitOfficerName: value }))}
                  onApprovedByChange={(value) => setFormData(prev => ({ ...prev, approvedBy: value }))}
                />
                <VisitDate
                  visitDate={formData.visitDate}
                  onDateChange={(value) => setFormData(prev => ({ ...prev, visitDate: value }))}
                />
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="error-message" style={{ marginBottom: '20px' }}>
                {submitError}
              </div>
            )}

            {/* Success Message - PMSF Ready */}
            {pmsfData && (
              <div className="success-message" style={{ marginBottom: '20px' }}>
                ✅ Form ready for quarter {new Date().getMonth() < 3 ? 'Q1' : new Date().getMonth() < 6 ? 'Q2' : new Date().getMonth() < 9 ? 'Q3' : 'Q4'}. {pmsfData.length} items loaded.
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-submit" disabled={submitLoading}>
                {submitLoading ? 'Checking...' : 'Generate Form'}
              </button>
              <button type="reset" className="btn-reset">
                Clear Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
