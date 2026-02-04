import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function BranchInformation({ onBranchDataChange }) {
  const [branchCode, setBranchCode] = useState('');
  const [branchData, setBranchData] = useState({
    branchName: '',
    division: '',
    region: '',
    area: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch branch data when branch code changes
  useEffect(() => {
    const fetchBranchData = async () => {
      if (branchCode.length >= 3) {
        setLoading(true);
        setError('');
        try {
          const response = await axios.get(
            `http://${window.location.hostname}:5000/api/branch/${branchCode}`
          );
          const data = {
            branchName: response.data.Name || '',
            division: response.data.Division || '',
            region: response.data.Region || '',
            area: response.data.Area || ''
          };
          setBranchData(data);
          
          // Notify parent component of branch data change
          if (onBranchDataChange) {
            onBranchDataChange({
              branchCode,
              ...data
            });
          }
        } catch (err) {
          const errorMsg = err.response?.data?.error || 'Failed to fetch branch data';
          setError(errorMsg);
          setBranchData({
            branchName: '',
            division: '',
            region: '',
            area: ''
          });
          
          // Notify parent of error
          if (onBranchDataChange) {
            onBranchDataChange(null);
          }
        } finally {
          setLoading(false);
        }
      } else {
        // Clear branch data if code is less than 3 characters
        setBranchData({
          branchName: '',
          division: '',
          region: '',
          area: ''
        });
        setError('');
        
        if (onBranchDataChange) {
          onBranchDataChange(null);
        }
      }
    };

    const debounceTimer = setTimeout(fetchBranchData, 500);
    return () => clearTimeout(debounceTimer);
  }, [branchCode]); // Removed onBranchDataChange from deps to prevent re-renders

  return (
    <div className="form-section form-section-branch">
      <h2 className="section-title">Branch Information</h2>
      
      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading-message">Loading branch data...</div>}
      
      <div className="branch-grid">
        <div className="form-group branch-code">
          <label htmlFor="branchCode">Branch Code</label>
          <input
            type="text"
            id="branchCode"
            placeholder="Enter branch code"
            className="form-input"
            value={branchCode}
            onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="form-group branch-name">
          <label htmlFor="branchName">Branch Name</label>
          <input
            type="text"
            id="branchName"
            className="form-input"
            value={branchData.branchName}
            readOnly
          />
        </div>
        <div className="form-group branch-division">
          <label htmlFor="division">Division</label>
          <input
            type="text"
            id="division"
            className="form-input"
            value={branchData.division}
            readOnly
          />
        </div>
        <div className="form-group branch-region">
          <label htmlFor="region">Region</label>
          <input
            type="text"
            id="region"
            className="form-input"
            value={branchData.region}
            readOnly
          />
        </div>
        <div className="form-group branch-area">
          <label htmlFor="area">Area</label>
          <input
            type="text"
            id="area"
            className="form-input"
            value={branchData.area}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
