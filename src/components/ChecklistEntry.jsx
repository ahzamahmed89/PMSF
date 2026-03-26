import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageHeader from './PageHeader';
import BackButton from './BackButton';
import Button from './Button';
import ErrorMessage from './ErrorMessage';
import { API_URL } from '../config/api';
import '../styles/ChecklistEntry.css';

const ChecklistEntry = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedTemplateId = location.state?.templateId || '';

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateDepartment, setSelectedTemplateDepartment] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId ? String(preselectedTemplateId) : '');
  const [template, setTemplate] = useState(null);
  const [entryMeta, setEntryMeta] = useState({
    branchCode: '',
    department: '',
    reviewDate: '',
    inputterName: localStorage.getItem('username') || '',
    reviewedBy: '',
    approvedBy: ''
  });
  const [itemValues, setItemValues] = useState({});
  const [uploading, setUploading] = useState({});
  const [pendingFiles, setPendingFiles] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openResponsibilityPickerItemId, setOpenResponsibilityPickerItemId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');
  const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

  const parseApiMediaPath = (filename) => {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000/images/${filename}`;
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees/departments`, {
        headers: getAuthHeaders()
      });
      const data = response.data;
      setDepartments(
        Array.isArray(data) ? data :
        Array.isArray(data?.departments) ? data.departments : []
      );
    } catch {
      setDepartments([]);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await axios.get(`${API_URL}/checklists/templates`, {
        headers: getAuthHeaders()
      });
      setTemplates(response.data.templates || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load checklist templates' });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const initializeItemValues = (templateData) => {
    const values = {};
    (templateData.items || []).forEach((item) => {
      values[item.itemId] = {
        selectedStatus: '',
        scoreAwarded: item.scoreAwarded ?? '',
        remarks: '',
        responsibilities: [],
        responsibilitySelection: [],
        responsibilityOther: '',
        timeline: '',
        imageUrls: [],
        videoUrls: [],
        attachmentUrl: ''
      };
    });
    setItemValues(values);
  };

  const fetchTemplateDetails = async (templateId) => {
    if (!templateId) {
      setTemplate(null);
      return;
    }

    setLoadingTemplate(true);
    try {
      const response = await axios.get(`${API_URL}/checklists/templates/${templateId}`, {
        headers: getAuthHeaders()
      });
      const templateData = response.data.template;
      setTemplate(templateData);
      setEntryMeta({
        branchCode: '',
        department: templateData.department || '',
        reviewDate: '',
        inputterName: localStorage.getItem('username') || '',
        reviewedBy: templateData.reviewedBy || '',
        approvedBy: templateData.approvedBy || ''
      });
      initializeItemValues(templateData);
      setPendingFiles({});
      setMessage({ type: '', text: '' });
    } catch (error) {
      setTemplate(null);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load template details' });
    } finally {
      setLoadingTemplate(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      fetchTemplateDetails(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!openResponsibilityPickerItemId) return;
      if (event.target.closest('.checklist-multiselect-dropdown')) return;
      setOpenResponsibilityPickerItemId(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openResponsibilityPickerItemId]);

  const updateItemValue = (itemId, field, value) => {
    setItemValues((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const availableResponsibilityOptions = useMemo(() => {
    return Array.from(new Set([...(template?.responsibilities || []), ...departments])).filter(Boolean);
  }, [template, departments]);

  const templateDepartments = useMemo(() => {
    return Array.from(new Set(templates.map((templateItem) => String(templateItem.department || '').trim()).filter(Boolean)));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!selectedTemplateDepartment) return templates;
    return templates.filter((templateItem) => String(templateItem.department || '') === selectedTemplateDepartment);
  }, [templates, selectedTemplateDepartment]);

  useEffect(() => {
    if (!selectedTemplateId || !templates.length) return;
    const selectedTemplate = templates.find((templateItem) => String(templateItem.id) === String(selectedTemplateId));
    if (selectedTemplate?.department) {
      setSelectedTemplateDepartment(String(selectedTemplate.department));
    }
  }, [selectedTemplateId, templates]);

  const handleResponsibilitySelectionChange = (itemId, values) => {
    setItemValues((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        responsibilitySelection: values,
        responsibilities: values.filter((value) => value && value !== '__other__'),
        responsibilityOther: values.includes('__other__') ? (prev[itemId]?.responsibilityOther || '') : ''
      }
    }));
  };

  const toggleResponsibilityOption = (itemId, value) => {
    const existing = itemValues[itemId]?.responsibilitySelection || [];
    const nextValues = existing.includes(value)
      ? existing.filter((item) => item !== value)
      : [...existing, value];

    handleResponsibilitySelectionChange(itemId, nextValues);
  };

  const handleResponsibilityOtherChange = (itemId, value) => {
    setItemValues((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        responsibilityOther: value,
        responsibilities: [
          ...((prev[itemId]?.responsibilitySelection || []).filter((item) => item && item !== '__other__')),
          ...(value.trim() ? [value.trim()] : [])
        ]
      }
    }));
  };

  const handleFilePick = (itemId, mediaType, files) => {
    setPendingFiles((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [mediaType]: files || []
      }
    }));
  };

  const handleImagePick = (itemId, files) => {
    const selectedFiles = Array.from(files || []);
    const existingCount = (itemValues[itemId]?.imageUrls || []).length;
    const maxAllowed = Math.max(0, 3 - existingCount);
    const limitedFiles = selectedFiles.slice(0, maxAllowed);

    handleFilePick(itemId, 'image', limitedFiles);

    if (selectedFiles.length > maxAllowed) {
      setMessage({ type: 'error', text: 'Maximum 3 images allowed per checklist item.' });
    }
  };

  const uploadMediaFiles = async (itemId, mediaType, files) => {
    if (!files.length) return [];

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('activityCode', `custom_checklist_${itemId}_${mediaType}`);

    setUploading((prev) => ({ ...prev, [`${itemId}-${mediaType}`]: true }));
    try {
      const response = await axios.post(`${API_URL}/upload-media`, formData);
      const uploadedFiles = response.data?.files || [];
      if (!uploadedFiles.length) {
        throw new Error('No file returned from upload');
      }

      return uploadedFiles.map((filename) => parseApiMediaPath(filename));
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to upload media.');
    } finally {
      setUploading((prev) => ({ ...prev, [`${itemId}-${mediaType}`]: false }));
    }
  };

  const removeUploadedMedia = (itemId, mediaType, indexToRemove) => {
    const field = mediaType === 'image' ? 'imageUrls' : 'videoUrls';
    setItemValues((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: (prev[itemId]?.[field] || []).filter((_, index) => index !== indexToRemove)
      }
    }));
  };

  const itemStatusOptions = (item) => {
    if (!template) return [];
    const statuses = template.statusMode === 'segment' && item.statusOptions?.length
      ? item.statusOptions
      : (template.globalStatuses || ['Yes', 'No']);
    return Array.from(new Set([...statuses, 'NA']));
  };

  const removeSelectedResponsibility = (itemId, responsibilityToRemove) => {
    setItemValues((prev) => {
      const currentSelection = prev[itemId]?.responsibilitySelection || [];
      const nextSelection = currentSelection.filter((value) => value !== responsibilityToRemove);
      const nextResponsibilities = (prev[itemId]?.responsibilities || []).filter((value) => value !== responsibilityToRemove);

      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          responsibilitySelection: nextSelection,
          responsibilities: nextResponsibilities
        }
      };
    });
  };

  const hasResponsibilityOptions = !!(template?.responsibilities?.length);

  const calculateScoreFromStatusRule = (item, selectedStatus) => {
    if (!template?.includeWeightedScore || !selectedStatus) return '';

    if (String(selectedStatus).trim().toUpperCase() === 'NA') {
      return 0;
    }

    const rules = Array.isArray(template.statusScoreRules) ? template.statusScoreRules : [];
    const rule = rules.find((entry) => String(entry.status || '').trim() === String(selectedStatus).trim());

    if (!rule) return '';

    const ruleValue = Number(rule.value);
    if (!Number.isFinite(ruleValue)) return '';

    if (rule.type === 'fixed') {
      return ruleValue;
    }

    const weightScore = Number(item.weightScore);
    if (!Number.isFinite(weightScore)) return '';

    return Number(((weightScore * ruleValue) / 100).toFixed(2));
  };

  const handleStatusChange = (item, selectedStatus) => {
    updateItemValue(item.itemId, 'selectedStatus', selectedStatus);

    if (!template?.includeWeightedScore) return;

    if (String(selectedStatus).trim().toUpperCase() === 'NA') {
      updateItemValue(item.itemId, 'scoreAwarded', 0);
      return;
    }

    const calculatedScore = calculateScoreFromStatusRule(item, selectedStatus);
    if (calculatedScore !== '') {
      updateItemValue(item.itemId, 'scoreAwarded', calculatedScore);
    }
  };

  const canSubmit = useMemo(() => {
    if (!template || !template.items?.length) return false;
    return template.items.every((item) => {
      const selected = itemValues[item.itemId]?.selectedStatus;
      if (!selected) return false;

      if (template.includeWeightedScore) {
        const scoreValue = Number(itemValues[item.itemId]?.scoreAwarded);
        return Number.isFinite(scoreValue);
      }

      return true;
    });
  }, [template, itemValues]);

  const scoreSummary = useMemo(() => {
    if (!template?.includeWeightedScore) {
      return { assigned: 0, achieved: 0, percentage: 0 };
    }

    const assigned = (template.items || []).reduce((sum, item) => {
      const maxScore = Number(item.weightScore);
      const selectedStatus = String(itemValues[item.itemId]?.selectedStatus || '').trim().toUpperCase();
      if (selectedStatus === 'NA') return sum;
      return Number.isFinite(maxScore) && maxScore >= 0 ? sum + maxScore : sum;
    }, 0);

    const achieved = (template.items || []).reduce((sum, item) => {
      const score = Number(itemValues[item.itemId]?.scoreAwarded);
      return Number.isFinite(score) ? sum + score : sum;
    }, 0);

    const percentage = assigned > 0 ? (achieved / assigned) * 100 : 0;

    return { assigned, achieved, percentage };
  }, [template, itemValues]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!template) return;

    const payload = {
      templateId: template.id,
      branchCode: entryMeta.branchCode,
      department: entryMeta.department,
      reviewDate: entryMeta.reviewDate,
      inputterName: entryMeta.inputterName,
      reviewedBy: template.includeReviewedBy ? entryMeta.reviewedBy : '',
      approvedBy: template.includeApprovedBy ? entryMeta.approvedBy : '',
      itemValues: []
    };

    setSaving(true);
    try {
      const resolvedItemValues = [];

      for (const item of (template.items || [])) {
        const itemId = item.itemId;
        const currentValue = itemValues[itemId] || {};

        let imageUrls = [...(currentValue.imageUrls || [])];
        let videoUrls = [...(currentValue.videoUrls || [])];
        let attachmentUrl = currentValue.attachmentUrl || '';

        const pendingImages = pendingFiles[itemId]?.image || [];
        const pendingVideos = pendingFiles[itemId]?.video || [];
        const pendingAttachments = pendingFiles[itemId]?.attachment || [];

        if (template.allowImage && pendingImages.length) {
          const remainingSlots = Math.max(0, 3 - imageUrls.length);
          const imageFilesToUpload = pendingImages.slice(0, remainingSlots);
          const uploadedImageUrls = await uploadMediaFiles(itemId, 'image', imageFilesToUpload);
          imageUrls = [...imageUrls, ...uploadedImageUrls];
          imageUrls = imageUrls.slice(0, 3);
        }

        if (template.allowVideo && pendingVideos.length) {
          const uploadedVideoUrls = await uploadMediaFiles(itemId, 'video', pendingVideos);
          videoUrls = [...videoUrls, ...uploadedVideoUrls];
        }

        if (template.allowAttachment && pendingAttachments.length) {
          const uploadedAttachments = await uploadMediaFiles(itemId, 'attachment', pendingAttachments);
          attachmentUrl = uploadedAttachments[uploadedAttachments.length - 1] || attachmentUrl;
        }

        resolvedItemValues.push({
          itemId,
          selectedStatus: currentValue.selectedStatus || '',
          scoreAwarded: template.includeWeightedScore ? Number(currentValue.scoreAwarded || 0) : null,
          remarks: currentValue.remarks || '',
          responsibilities: (template.includeResponsibilities || hasResponsibilityOptions)
            ? (currentValue.responsibilities || [])
            : [],
          timeline: template.includeTimeline ? (currentValue.timeline || '') : '',
          imageUrls,
          videoUrls,
          imageUrl: imageUrls[0] || '',
          videoUrl: videoUrls[0] || '',
          attachmentUrl
        });
      }

      payload.itemValues = resolvedItemValues;

      const response = await axios.post(`${API_URL}/checklists/entries`, payload, {
        headers: getAuthHeaders()
      });

      setMessage({
        type: 'success',
        text: `Checklist submitted successfully. Entry ID: ${response.data.entryId}`
      });
      initializeItemValues(template);
      setPendingFiles({});
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || error.message || 'Failed to submit checklist.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checklist-entry-page">
      <PageHeader onLogout={onLogout} compactMenu />
      <BackButton onClick={() => navigate(-1)} />

      <div className="checklist-entry-content">
        <section className="checklist-entry-section">
          <div className="checklist-entry-header">
            <h1>Checklist Input</h1>
            <p>Select checklist, then complete all segments with status, remarks, responsibility, and optional media.</p>
          </div>

          <div className="checklist-entry-template-picker">
            <label>
              Department
              <select
                value={selectedTemplateDepartment}
                onChange={(event) => {
                  setSelectedTemplateDepartment(event.target.value);
                  setSelectedTemplateId('');
                  setTemplate(null);
                }}
                disabled={loadingTemplates}
              >
                <option value="">All departments</option>
                {templateDepartments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>

            <label>
              Checklist Template
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                disabled={loadingTemplates}
              >
                <option value="">Choose a checklist template</option>
                {filteredTemplates.length === 0 && selectedTemplateDepartment && (
                  <option value="" disabled>No checklist in selected department</option>
                )}
                {filteredTemplates.map((templateItem) => (
                  <option key={templateItem.id} value={templateItem.id}>
                    {templateItem.checklistName} ({templateItem.department})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loadingTemplate && <p className="checklist-empty">Loading checklist...</p>}

          {!loadingTemplate && template && (
            <form onSubmit={handleSubmit} className="checklist-entry-form">
              <div className="checklist-entry-meta four-columns">
                <label>
                  Department
                  <input
                    list="entryDepartments"
                    value={entryMeta.department}
                    onChange={(event) => setEntryMeta((prev) => ({ ...prev, department: event.target.value }))}
                    placeholder="Select or type department"
                  />
                  <datalist id="entryDepartments">
                    {departments.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </label>

                {template.checklistScope === 'branch' && (
                  <label>
                    Branch Code
                    <input
                      value={entryMeta.branchCode}
                      onChange={(event) => setEntryMeta((prev) => ({ ...prev, branchCode: event.target.value }))}
                      placeholder="Branch code"
                    />
                  </label>
                )}

                <label>
                  Review Date
                  <input
                    type="date"
                    value={entryMeta.reviewDate}
                    onChange={(event) => setEntryMeta((prev) => ({ ...prev, reviewDate: event.target.value }))}
                  />
                </label>

                <label>
                  Inputter Name
                  <input
                    value={entryMeta.inputterName}
                    onChange={(event) => setEntryMeta((prev) => ({ ...prev, inputterName: event.target.value }))}
                    placeholder="Inputter name"
                  />
                </label>

                {template.includeReviewedBy && (
                  <label>
                    {template.reviewedBy || 'Reviewed By'}
                    <input
                      value={entryMeta.reviewedBy}
                      onChange={(event) => setEntryMeta((prev) => ({ ...prev, reviewedBy: event.target.value }))}
                    />
                  </label>
                )}

                {template.includeApprovedBy && (
                  <label>
                    {template.approvedBy || 'Approved By'}
                    <input
                      value={entryMeta.approvedBy}
                      onChange={(event) => setEntryMeta((prev) => ({ ...prev, approvedBy: event.target.value }))}
                    />
                  </label>
                )}
              </div>

              {template.includeWeightedScore && (
                <div className="checklist-score-summary-entry checklist-score-summary-top">
                  <strong>Overall Score:</strong>
                  <span>Total Assigned: {scoreSummary.assigned.toFixed(2)}</span>
                  <span>Total Achieved: {scoreSummary.achieved.toFixed(2)}</span>
                  <span>Percentage: {scoreSummary.percentage.toFixed(2)}%</span>
                </div>
              )}

              <div className="checklist-items-list">
                {template.items.map((item) => (
                  <article key={item.itemId} className="checklist-entry-item">
                    <div className="checklist-entry-item-head">
                      <h3>{template.categoryHeader || 'Category'}: {item.category}</h3>
                      {item.subCategory && <p>{template.subCategoryHeader || 'Sub Category'}: {item.subCategory}</p>}
                      {(() => {
                        const descriptionValues = Array.isArray(item.descriptionValues)
                          ? item.descriptionValues
                          : [];
                        const headers = (template.descriptionHeaders || []).length
                          ? template.descriptionHeaders
                          : descriptionValues.map((_, index) => `Description ${index + 1}`);

                        const renderedDescriptions = headers.map((header, index) => ({
                          header: header || `Description ${index + 1}`,
                          value: descriptionValues[index] || ''
                        })).filter((entry) => String(entry.value).trim());

                        if (renderedDescriptions.length > 0) {
                          return renderedDescriptions.map((entry, index) => (
                            <p key={`${item.itemId}-description-${index}`}>
                              {entry.header}: {entry.value}
                            </p>
                          ));
                        }

                        if (String(item.description || '').trim()) {
                          return (
                            <p key={`${item.itemId}-description-fallback`}>
                              Description: {String(item.description).trim()}
                            </p>
                          );
                        }

                        return (
                          <p key={`${item.itemId}-description-empty`}>
                            Description: -
                          </p>
                        );
                      })()}
                    </div>

                    <div className="checklist-entry-item-grid">
                      <label>
                        Status
                        <select
                          value={itemValues[item.itemId]?.selectedStatus || ''}
                          onChange={(event) => handleStatusChange(item, event.target.value)}
                          required
                        >
                          <option value="">Select status</option>
                          {itemStatusOptions(item).map((statusOption) => (
                            <option key={`${item.itemId}-${statusOption}`} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="checklist-entry-wide">
                        Remarks
                        <textarea
                          value={itemValues[item.itemId]?.remarks || ''}
                          onChange={(event) => updateItemValue(item.itemId, 'remarks', event.target.value)}
                          placeholder="Remarks"
                        />
                      </label>

                      {template.includeWeightedScore && (
                        <div className="checklist-score-awarded-text">
                          Score Awarded: {Number(itemValues[item.itemId]?.scoreAwarded || 0).toFixed(2)}
                          {' '} / {Number.isFinite(Number(item.weightScore)) ? Number(item.weightScore).toFixed(2) : '0.00'}
                        </div>
                      )}
                    </div>

                    {template.includeTimeline && (
                      <div className="checklist-timeline-row">
                        <label>
                          Timeline
                          <input
                            type="date"
                            value={itemValues[item.itemId]?.timeline || ''}
                            onChange={(event) => updateItemValue(item.itemId, 'timeline', event.target.value)}
                          />
                        </label>
                      </div>
                    )}

                    {(template.includeResponsibilities || hasResponsibilityOptions) && availableResponsibilityOptions.length > 0 && (
                      <div className="checklist-responsibility-block">
                        <p>Responsibility</p>
                        <div className="checklist-responsibility-select-row">
                          <label>
                            Select Responsibilities
                            <div className="checklist-multiselect-dropdown">
                              <button
                                type="button"
                                className="checklist-multiselect-trigger"
                                onClick={() => setOpenResponsibilityPickerItemId((prev) => prev === item.itemId ? null : item.itemId)}
                              >
                                {(itemValues[item.itemId]?.responsibilitySelection || []).length
                                  ? `${(itemValues[item.itemId]?.responsibilitySelection || []).filter((value) => value !== '__other__').length}${(itemValues[item.itemId]?.responsibilitySelection || []).includes('__other__') ? ' + Other' : ''} selected`
                                  : 'Select responsibilities'}
                              </button>
                              {openResponsibilityPickerItemId === item.itemId && (
                                <div className="checklist-multiselect-menu">
                                  {availableResponsibilityOptions.map((responsibility) => (
                                    <label key={`${item.itemId}-${responsibility}`} className="checklist-multiselect-option">
                                      <input
                                        type="checkbox"
                                        checked={(itemValues[item.itemId]?.responsibilitySelection || []).includes(responsibility)}
                                        onChange={() => toggleResponsibilityOption(item.itemId, responsibility)}
                                      />
                                      <span>{responsibility}</span>
                                    </label>
                                  ))}
                                  <label className="checklist-multiselect-option">
                                    <input
                                      type="checkbox"
                                      checked={(itemValues[item.itemId]?.responsibilitySelection || []).includes('__other__')}
                                      onChange={() => toggleResponsibilityOption(item.itemId, '__other__')}
                                    />
                                    <span>Other</span>
                                  </label>
                                </div>
                              )}
                            </div>
                            <small className="checklist-field-helper">Select one or more responsibilities from the dropdown.</small>
                          </label>

                          {(itemValues[item.itemId]?.responsibilitySelection || []).includes('__other__') && (
                            <label>
                              Other Responsibility / Department
                              <input
                                value={itemValues[item.itemId]?.responsibilityOther || ''}
                                onChange={(event) => handleResponsibilityOtherChange(item.itemId, event.target.value)}
                                placeholder="Type custom responsibility"
                              />
                            </label>
                          )}
                        </div>

                        {(itemValues[item.itemId]?.responsibilities || []).length > 0 && (
                          <div className="checklist-responsibility-selected-list">
                            {(itemValues[item.itemId]?.responsibilities || []).map((responsibility, index) => (
                              <span key={`${item.itemId}-selected-responsibility-${index}`} className="checklist-responsibility-chip">
                                {responsibility}
                                <button
                                  type="button"
                                  className="checklist-responsibility-chip-remove"
                                  onClick={() => removeSelectedResponsibility(item.itemId, responsibility)}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(template.allowImage || template.allowVideo || template.allowAttachment) && (
                      <div className="checklist-media-block">
                        {(template.allowImage || template.allowAttachment) && (
                          <div className="checklist-media-inline-row">
                            {template.allowImage && (
                              <div className="checklist-media-inline-field">
                                <label>
                                  Images (max 3)
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(event) => handleImagePick(item.itemId, event.target.files || [])}
                                  />
                                </label>
                                {(pendingFiles[item.itemId]?.image || []).length > 0 && (
                                  <p className="checklist-field-helper">{(pendingFiles[item.itemId]?.image || []).length} image(s) selected. They will upload on submit.</p>
                                )}
                              </div>
                            )}

                            {template.allowAttachment && (
                              <div className="checklist-media-inline-field">
                                <label>
                                  Attachment
                                  <input
                                    type="file"
                                    onChange={(event) => handleFilePick(item.itemId, 'attachment', Array.from(event.target.files || []))}
                                  />
                                </label>
                                {(pendingFiles[item.itemId]?.attachment || []).length > 0 && (
                                  <p className="checklist-field-helper">Attachment selected. It will upload on submit.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {template.allowImage && (itemValues[item.itemId]?.imageUrls || []).length > 0 && (
                          <div className="checklist-uploaded-list">
                            {(itemValues[item.itemId]?.imageUrls || []).map((url, index) => (
                              <div key={`${item.itemId}-image-${index}`} className="checklist-uploaded-item">
                                <a href={url} target="_blank" rel="noreferrer">Image {index + 1}</a>
                                <button type="button" onClick={() => removeUploadedMedia(item.itemId, 'image', index)}>✖</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {template.allowVideo && (
                          <div className="checklist-media-row">
                            <label>
                              Videos
                              <input
                                type="file"
                                accept="video/*"
                                multiple
                                onChange={(event) => handleFilePick(item.itemId, 'video', Array.from(event.target.files || []))}
                              />
                            </label>
                            {(pendingFiles[item.itemId]?.video || []).length > 0 && (
                              <p className="checklist-field-helper">{(pendingFiles[item.itemId]?.video || []).length} video(s) selected. They will upload on submit.</p>
                            )}
                            {(itemValues[item.itemId]?.videoUrls || []).length > 0 && (
                              <div className="checklist-uploaded-list">
                                {(itemValues[item.itemId]?.videoUrls || []).map((url, index) => (
                                  <div key={`${item.itemId}-video-${index}`} className="checklist-uploaded-item">
                                    <a href={url} target="_blank" rel="noreferrer">Video {index + 1}</a>
                                    <button type="button" onClick={() => removeUploadedMedia(item.itemId, 'video', index)}>✖</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {template.allowAttachment && itemValues[item.itemId]?.attachmentUrl && (
                          <div className="checklist-uploaded-list">
                            <div className="checklist-uploaded-item">
                              <a href={itemValues[item.itemId]?.attachmentUrl} target="_blank" rel="noreferrer">Attachment</a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {template.includeWeightedScore && (
                <div className="checklist-score-summary-entry">
                  <strong>Score Summary:</strong>
                  <span>Total Assigned: {scoreSummary.assigned.toFixed(2)}</span>
                  <span>Total Achieved: {scoreSummary.achieved.toFixed(2)}</span>
                </div>
              )}

              <div className="checklist-submit-row">
                <Button type="submit" variant="primary" loading={saving} disabled={!canSubmit || Object.values(uploading).some(Boolean)}>
                  Submit Checklist
                </Button>
              </div>
            </form>
          )}

          {!loadingTemplate && !template && !selectedTemplateId && (
            <p className="checklist-empty">Select a checklist template to begin data entry.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChecklistEntry;
