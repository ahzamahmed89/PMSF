import React from 'react';

export default function VisitOfficerApproval({ 
  visitOfficerName, 
  approvedBy, 
  onOfficerNameChange, 
  onApprovedByChange 
}) {
  const defaultOfficerName = 'User';

  return (
    <>
      <div className="form-group">
        <label htmlFor="visitOfficerName">Visit Officer Name</label>
        <input
          type="text"
          id="visitOfficerName"
          value={visitOfficerName || defaultOfficerName}
          onChange={(e) => onOfficerNameChange && onOfficerNameChange(e.target.value)}
          className="form-input"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="approvedByBMOM">Approved By BM/OM</label>
        <input
          type="text"
          id="approvedByBMOM"
          placeholder="Enter approver name (BM/OM)"
          value={approvedBy || ''}
          onChange={(e) => onApprovedByChange && onApprovedByChange(e.target.value)}
          className="form-input"
        />
      </div>
    </>
  );
}
