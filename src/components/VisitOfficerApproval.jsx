import React from 'react';
import FormInput from './FormInput';

export default function VisitOfficerApproval({ 
  visitOfficerName, 
  approvedBy, 
  onOfficerNameChange, 
  onApprovedByChange 
}) {
  const defaultOfficerName = 'User';

  return (
    <>
      <FormInput
        label="Visit Officer Name"
        id="visitOfficerName"
        value={visitOfficerName || defaultOfficerName}
        onChange={(e) => onOfficerNameChange && onOfficerNameChange(e.target.value)}
      />
      
      <FormInput
        label="Approved By BM/OM"
        id="approvedByBMOM"
        placeholder="Enter approver name (BM/OM)"
        value={approvedBy || ''}
        onChange={(e) => onApprovedByChange && onApprovedByChange(e.target.value)}
      />
    </>
  );
}
