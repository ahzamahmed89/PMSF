import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageHeader from './PageHeader';
import BackButton from './BackButton';
import Button from './Button';
import ErrorMessage from './ErrorMessage';
import { API_URL } from '../config/api';
import '../styles/ChecklistManager.css';

const emptyItem = (descriptionCount = 0) => ({
  category: '',
  subCategory: '',
  descriptionValues: Array.from({ length: descriptionCount }, () => ''),
  statusOptions: '',
  weightScore: ''
});
const parseListValues = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const defaultForm = {
  checklistName: '',
  department: '',
  checklistScope: 'branch',
  categoryHeader: 'Category',
  subCategoryHeader: 'Sub Category',
  descriptionHeaders: [],
  statusMode: 'global',
  includeWeightedScore: false,
  globalStatuses: 'Yes,No,NA',
  statusScoreRules: [],
  includeResponsibilities: true,
  responsibilities: [],
  includeReviewedBy: false,
  reviewedBy: '',
  includeApprovedBy: false,
  approvedBy: '',
  includeTimeline: false,
  allowImage: true,
  allowVideo: false,
  allowAttachment: false,
  items: [emptyItem(0)]
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const csvEscape = (value) => {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const ChecklistManager = ({ onLogout }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [responsibilityInput, setResponsibilityInput] = useState('');
  const [responsibilitySelectValue, setResponsibilitySelectValue] = useState([]);
  const [showResponsibilityPicker, setShowResponsibilityPicker] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [templatesDropdownMode, setTemplatesDropdownMode] = useState('all');
  const [templateFilterDepartment, setTemplateFilterDepartment] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const getToken = () => localStorage.getItem('authToken') || localStorage.getItem('token');
  const getAuthHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

  const formTitle = useMemo(
    () => (editingTemplateId ? 'Edit Checklist Template' : 'Create Checklist Template'),
    [editingTemplateId]
  );

  const totalAssignedScore = useMemo(() => (
    form.items.reduce((sum, item) => {
      const score = Number(item.weightScore);
      return Number.isFinite(score) && score >= 0 ? sum + score : sum;
    }, 0)
  ), [form.items]);

  const availableStatuses = useMemo(() => {
    if (form.statusMode === 'global') {
      return Array.from(new Set(parseListValues(form.globalStatuses)));
    }

    const segmentStatuses = form.items.flatMap((item) => parseListValues(item.statusOptions));
    return Array.from(new Set(segmentStatuses));
  }, [form.statusMode, form.globalStatuses, form.items]);

  const templateDepartments = useMemo(() => {
    return Array.from(new Set(templates.map((templateItem) => String(templateItem.department || '').trim()).filter(Boolean)));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!templateFilterDepartment) return templates;
    return templates.filter((templateItem) => String(templateItem.department || '') === templateFilterDepartment);
  }, [templates, templateFilterDepartment]);

  useEffect(() => {
    if (!form.includeWeightedScore) return;

    setForm((prev) => {
      const existingRules = Array.isArray(prev.statusScoreRules) ? prev.statusScoreRules : [];
      const syncedRules = availableStatuses.map((status) => {
        const existing = existingRules.find((rule) => rule.status === status);
        if (existing) return existing;
        return {
          status,
          value: status.toLowerCase() === 'yes' ? 100 : 0,
          type: 'percentage'
        };
      });

      const unchanged =
        syncedRules.length === existingRules.length &&
        syncedRules.every((rule, index) => (
          rule.status === existingRules[index]?.status &&
          Number(rule.value) === Number(existingRules[index]?.value) &&
          (rule.type || 'percentage') === (existingRules[index]?.type || 'percentage')
        ));

      if (unchanged) return prev;
      return { ...prev, statusScoreRules: syncedRules };
    });
  }, [availableStatuses, form.includeWeightedScore]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/checklists/templates`, {
        headers: getAuthHeaders()
      });
      setTemplates(response.data.templates || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load checklist templates' });
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchTemplates();
    fetchDepartments();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!showResponsibilityPicker) return;
      if (event.target.closest('.checklist-multiselect-dropdown')) return;
      setShowResponsibilityPicker(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showResponsibilityPicker]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!showTemplatesDropdown) return;
      if (event.target.closest('.checklist-template-dropdown')) return;
      if (event.target.closest('.checklist-card-header-actions')) return;
      setShowTemplatesDropdown(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showTemplatesDropdown]);

  // When scope changes to a department name, auto-add it as first responsibility
  useEffect(() => {
    const scope = form.checklistScope?.trim();
    if (!scope || scope === 'branch' || scope === 'department') return;
    setForm((prev) => {
      if (prev.responsibilities.includes(scope)) return prev;
      return { ...prev, responsibilities: [scope, ...prev.responsibilities] };
    });
  }, [form.checklistScope]);

  const addResponsibility = () => {
    const val = responsibilityInput.trim();
    if (!val) return;
    setForm((prev) => {
      if (prev.responsibilities.includes(val)) return prev;
      return { ...prev, responsibilities: [...prev.responsibilities, val] };
    });
    setResponsibilityInput('');
    setResponsibilitySelectValue([]);
  };

  const addAllDepartmentsAsResponsibilities = () => {
    setForm((prev) => ({
      ...prev,
      responsibilities: Array.from(new Set([...(prev.responsibilities || []), ...departments]))
    }));
  };

  const addSelectedResponsibilities = () => {
    const selectedValues = (responsibilitySelectValue || []).filter((value) => value && value !== '__other__');
    if (!selectedValues.length) return;

    setForm((prev) => ({
      ...prev,
      responsibilities: Array.from(new Set([...(prev.responsibilities || []), ...selectedValues]))
    }));
    setResponsibilitySelectValue([]);
  };

  const handleResponsibilitySelect = (values) => {
    setResponsibilitySelectValue(values);
    if (values.includes('__other__')) {
      setResponsibilityInput('');
    }
  };

  const toggleResponsibilityOption = (value) => {
    setResponsibilitySelectValue((prev) => (
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    ));
    if (value === '__other__') {
      setResponsibilityInput('');
    }
  };

  const removeResponsibility = (index) => {
    setForm((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index)
    }));
  };

  const addDescriptionHeader = () => {
    setForm((prev) => {
      const nextHeaders = [...prev.descriptionHeaders, `Description ${prev.descriptionHeaders.length + 1}`];
      const nextItems = prev.items.map((item) => ({
        ...item,
        descriptionValues: [...(item.descriptionValues || []), '']
      }));

      return {
        ...prev,
        descriptionHeaders: nextHeaders,
        items: nextItems
      };
    });
  };

  const removeDescriptionHeader = (headerIndex) => {
    setForm((prev) => {
      const nextHeaders = prev.descriptionHeaders.filter((_, index) => index !== headerIndex);
      const nextItems = prev.items.map((item) => ({
        ...item,
        descriptionValues: (item.descriptionValues || []).filter((_, index) => index !== headerIndex)
      }));

      return {
        ...prev,
        descriptionHeaders: nextHeaders,
        items: nextItems
      };
    });
  };

  const updateDescriptionHeader = (headerIndex, value) => {
    setForm((prev) => ({
      ...prev,
      descriptionHeaders: prev.descriptionHeaders.map((header, index) => (
        index === headerIndex ? value : header
      ))
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem(prev.descriptionHeaders.length)] }));
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= form.items.length) return;

    setForm((prev) => {
      const nextItems = [...prev.items];
      [nextItems[index], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[index]];
      return { ...prev, items: nextItems };
    });
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateItemDescription = (itemIndex, descriptionIndex, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, index) => {
        if (index !== itemIndex) return item;

        const descriptionValues = [...(item.descriptionValues || [])];
        descriptionValues[descriptionIndex] = value;

        return {
          ...item,
          descriptionValues
        };
      })
    }));
  };

  const downloadCsvTemplate = () => {
    const headers = [form.categoryHeader || 'Category', form.subCategoryHeader || 'Sub Category'];
    form.descriptionHeaders.forEach((header) => {
      headers.push(header?.trim() || 'Description');
    });
    if (form.statusMode === 'segment') {
      headers.push('Status Options');
    }
    if (form.includeWeightedScore) {
      headers.push('Weight Score');
    }

    const rows = (form.items.length ? form.items : [emptyItem(form.descriptionHeaders.length)]).map((item) => {
      const row = [item.category, item.subCategory];
      form.descriptionHeaders.forEach((_, index) => {
        row.push(item.descriptionValues?.[index] || '');
      });
      if (form.statusMode === 'segment') {
        row.push(item.statusOptions);
      }
      if (form.includeWeightedScore) {
        row.push(item.weightScore);
      }
      return row;
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.checklistName?.trim() || 'checklist'}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

        if (lines.length < 2) {
          setMessage({ type: 'error', text: 'CSV should include a header and at least one data row.' });
          return;
        }

        const headerRow = parseCsvLine(lines[0]);
        const header = headerRow.map((value) => value.toLowerCase().trim());

        const findHeaderIndex = (candidates) => {
          const normalizedCandidates = candidates
            .map((candidate) => String(candidate || '').toLowerCase().trim())
            .filter(Boolean);
          return header.findIndex((value) => normalizedCandidates.includes(value));
        };

        const categoryIndex = findHeaderIndex([
          form.categoryHeader,
          'category',
          'observation'
        ]);
        const subCategoryIndex = findHeaderIndex([
          form.subCategoryHeader,
          'sub category',
          'subcategory',
          'sub observation',
          'sub-observation'
        ]);
        const statusIndex = header.findIndex((value) => value === 'status options' || value === 'status');
        const scoreIndex = header.findIndex((value) => value === 'weight score' || value === 'score');

        const descriptionHeaders = [];
        const descriptionIndexes = [];
        const existingDescriptionHeaders = (form.descriptionHeaders || []).map((value) => value.toLowerCase());

        headerRow.forEach((rawHeader, index) => {
          const normalized = String(rawHeader || '').trim().toLowerCase();
          const isKnownColumn = [categoryIndex, subCategoryIndex, statusIndex, scoreIndex].includes(index);
          if (isKnownColumn || !normalized) return;

          if (normalized.startsWith('description') || existingDescriptionHeaders.includes(normalized)) {
            descriptionHeaders.push(rawHeader.trim() || `Description ${descriptionHeaders.length + 1}`);
            descriptionIndexes.push(index);
          }
        });

        if (categoryIndex < 0 || subCategoryIndex < 0) {
          setMessage({
            type: 'error',
            text: `CSV header must contain ${form.categoryHeader || 'Category'} and ${form.subCategoryHeader || 'Sub Category'} columns.`
          });
          return;
        }

        const parsedItems = lines.slice(1)
          .map((line) => parseCsvLine(line))
          .map((columns) => ({
            category: columns[categoryIndex] || '',
            subCategory: columns[subCategoryIndex] || '',
            descriptionValues: descriptionIndexes.map((columnIndex) => columns[columnIndex] || ''),
            statusOptions: statusIndex >= 0 ? (columns[statusIndex] || '') : '',
            weightScore: scoreIndex >= 0 ? (columns[scoreIndex] || '') : ''
          }))
          .filter((row) => row.category.trim());

        if (!parsedItems.length) {
          setMessage({ type: 'error', text: 'No valid category rows found in CSV.' });
          return;
        }

        setForm((prev) => ({
          ...prev,
          descriptionHeaders,
          items: parsedItems.map((item) => ({
            ...item,
            descriptionValues: item.descriptionValues.length
              ? item.descriptionValues
              : Array.from({ length: descriptionHeaders.length }, () => '')
          }))
        }));
        setMessage({ type: 'success', text: `Loaded ${parsedItems.length} rows from CSV.` });
      } catch {
        setMessage({ type: 'error', text: 'Failed to parse CSV file.' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const parseList = (value) => parseListValues(value);

  const updateStatusRule = (status, field, value) => {
    setForm((prev) => ({
      ...prev,
      statusScoreRules: (prev.statusScoreRules || []).map((rule) => (
        rule.status === status ? { ...rule, [field]: value } : rule
      ))
    }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingTemplateId(null);
  };

  const handleEditTemplate = async (templateId) => {
    try {
      const response = await axios.get(`${API_URL}/checklists/templates/${templateId}`, {
        headers: getAuthHeaders()
      });

      const template = response.data.template;
      setEditingTemplateId(template.id);
      setForm({
        checklistName: template.checklistName || '',
        department: template.department || '',
        checklistScope: template.checklistScope || 'branch',
        categoryHeader: template.categoryHeader || 'Category',
        subCategoryHeader: template.subCategoryHeader || 'Sub Category',
        descriptionHeaders: template.descriptionHeaders || [],
        statusMode: template.statusMode || 'global',
        includeWeightedScore: !!template.includeWeightedScore,
        globalStatuses: (template.globalStatuses || []).join(', '),
        statusScoreRules: Array.isArray(template.statusScoreRules)
          ? template.statusScoreRules.map((rule) => ({
            status: String(rule.status || '').trim(),
            value: Number.isFinite(Number(rule.value)) ? Number(rule.value) : 0,
            type: rule.type === 'fixed' ? 'fixed' : 'percentage'
          })).filter((rule) => rule.status)
          : [],
        includeResponsibilities: !!template.includeResponsibilities || (template.responsibilities || []).length > 0,
        responsibilities: (template.responsibilities || []),
        includeReviewedBy: !!template.includeReviewedBy,
        reviewedBy: template.reviewedBy || '',
        includeApprovedBy: !!template.includeApprovedBy,
        approvedBy: template.approvedBy || '',
        includeTimeline: !!template.includeTimeline,
        allowImage: !!template.allowImage,
        allowVideo: !!template.allowVideo,
        allowAttachment: !!template.allowAttachment,
        items:
          template.items?.map((item) => ({
            category: item.category || '',
            subCategory: item.subCategory || '',
            descriptionValues: item.descriptionValues || [],
            statusOptions: (item.statusOptions || []).join(', '),
            weightScore: item.weightScore ?? ''
          })) || [emptyItem((template.descriptionHeaders || []).length)]
      });
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load template details' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedItems = form.items
      .map((item) => ({
        category: item.category.trim(),
        subCategory: item.subCategory.trim(),
        descriptionValues: (item.descriptionValues || []).map((value) => String(value || '').trim()),
        statusOptions: parseList(item.statusOptions),
        weightScore: Number.isFinite(Number(item.weightScore)) ? Number(item.weightScore) : null
      }))
      .filter((item) => item.category);

    if (!form.checklistName.trim() || !form.department.trim()) {
      setMessage({ type: 'error', text: 'Checklist name and department are required.' });
      return;
    }

    if (!normalizedItems.length) {
      setMessage({ type: 'error', text: 'At least one category is required.' });
      return;
    }

    if (form.statusMode === 'global' && parseList(form.globalStatuses).length === 0) {
      setMessage({ type: 'error', text: 'Please provide common status options for global criteria mode.' });
      return;
    }

    if (form.statusMode === 'segment') {
      const missingStatus = normalizedItems.find((item) => item.statusOptions.length === 0);
      if (missingStatus) {
        setMessage({ type: 'error', text: 'Status options are required for every row in segment mode.' });
        return;
      }
    }

    if (form.includeWeightedScore) {
      const invalidScore = normalizedItems.find((item) => item.weightScore === null || item.weightScore < 0);
      if (invalidScore) {
        setMessage({ type: 'error', text: 'Weighted score is enabled. Please enter a valid score for every segment.' });
        return;
      }
    }

    const shouldIncludeResponsibilities = form.includeResponsibilities || form.responsibilities.length > 0;

    const normalizedStatusScoreRules = (form.statusScoreRules || [])
      .map((rule) => ({
        status: String(rule.status || '').trim(),
        value: Number(rule.value),
        type: rule.type === 'fixed' ? 'fixed' : 'percentage'
      }))
      .filter((rule) => rule.status && Number.isFinite(rule.value));

    if (form.includeWeightedScore && availableStatuses.length && normalizedStatusScoreRules.length !== availableStatuses.length) {
      setMessage({ type: 'error', text: 'Please configure weighted score rule for every status option.' });
      return;
    }

    const payload = {
      checklistName: form.checklistName.trim(),
      department: form.department.trim(),
      checklistScope: form.checklistScope,
      categoryHeader: form.categoryHeader.trim() || 'Category',
      subCategoryHeader: form.subCategoryHeader.trim() || 'Sub Category',
      descriptionHeaders: form.descriptionHeaders.map((header, index) => {
        const cleaned = String(header || '').trim();
        return cleaned || `Description ${index + 1}`;
      }),
      statusMode: form.statusMode,
      includeWeightedScore: form.includeWeightedScore,
      globalStatuses: form.statusMode === 'global' ? parseList(form.globalStatuses) : [],
      statusScoreRules: form.includeWeightedScore ? normalizedStatusScoreRules : [],
      includeResponsibilities: shouldIncludeResponsibilities,
      responsibilities: shouldIncludeResponsibilities ? form.responsibilities : [],
      includeReviewedBy: form.includeReviewedBy,
      reviewedBy: form.includeReviewedBy ? form.reviewedBy.trim() : '',
      includeApprovedBy: form.includeApprovedBy,
      approvedBy: form.includeApprovedBy ? form.approvedBy.trim() : '',
      includeTimeline: form.includeTimeline,
      allowImage: form.allowImage,
      allowVideo: form.allowVideo,
      allowAttachment: form.allowAttachment,
      items: normalizedItems
    };

    setSaving(true);
    try {
      if (editingTemplateId) {
        await axios.put(`${API_URL}/checklists/templates/${editingTemplateId}`, payload, {
          headers: getAuthHeaders()
        });
        setMessage({ type: 'success', text: 'Checklist template updated successfully.' });
      } else {
        await axios.post(`${API_URL}/checklists/templates`, payload, {
          headers: getAuthHeaders()
        });
        setMessage({ type: 'success', text: 'Checklist template created successfully.' });
      }

      resetForm();
      await fetchTemplates();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save template.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="checklist-manager-page">
      <PageHeader onLogout={onLogout} compactMenu />
      <BackButton onClick={() => navigate(-1)} />

      <div className="checklist-manager-content">
        <div className="checklist-manager-header">
          <h1>Custom Checklist Manager</h1>
          <p>Create department or branch based checklists with your own categories and criteria.</p>
        </div>

        {message.text && (
          <ErrorMessage
            type={message.type === 'error' ? 'error' : 'success'}
            message={message.text}
            onDismiss={() => setMessage({ type: '', text: '' })}
          />
        )}

        <div className="checklist-manager-grid">
          <section className="checklist-card checklist-card-main">
            <div className="checklist-card-header-row">
              <h2>{formTitle}</h2>
              <div className="checklist-card-header-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTemplatesDropdownMode('all');
                    setShowTemplatesDropdown((prev) => !prev);
                  }}
                >
                  {showTemplatesDropdown ? 'Close Checklists' : 'Open Available Checklists'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTemplatesDropdownMode('edit');
                    setShowTemplatesDropdown(true);
                  }}
                >
                  Edit Existing Checklist
                </Button>
              </div>
            </div>

            {showTemplatesDropdown && (
              <>
                <div className="checklist-template-dropdown" onClick={(event) => event.stopPropagation()}>
                  <h3>{templatesDropdownMode === 'edit' ? 'Select Checklist to Edit' : 'Available Checklists'}</h3>
                  <select
                    className="checklist-template-search"
                    value={templateFilterDepartment}
                    onChange={(event) => setTemplateFilterDepartment(event.target.value)}
                  >
                    <option value="">All departments</option>
                    {templateDepartments.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                  {loading ? (
                    <p className="checklist-empty">Loading templates...</p>
                  ) : filteredTemplates.length === 0 ? (
                    <p className="checklist-empty">No templates yet. Create your first customized checklist.</p>
                  ) : (
                    <div className="checklist-template-list">
                      {filteredTemplates.map((template) => (
                        <article key={template.id} className="checklist-template-item">
                          <h3>{template.checklistName}</h3>
                          <p><strong>Department:</strong> {template.department}</p>
                          <p><strong>Scope:</strong> {template.checklistScope}</p>
                          <p><strong>Segments:</strong> {template.itemCount}</p>
                          <div className="checklist-template-actions">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowTemplatesDropdown(false);
                                handleEditTemplate(template.id);
                              }}
                            >
                              Edit
                            </Button>
                            {templatesDropdownMode !== 'edit' && (
                              <Button
                                type="button"
                                variant="primary"
                                onClick={() => {
                                  setShowTemplatesDropdown(false);
                                  navigate('/checklist-entry', { state: { templateId: template.id } });
                                }}
                              >
                                Start Checklist
                              </Button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="checklist-form">
              <div className="checklist-form-segment">
                <h3 className="checklist-form-segment-title">Text Fields</h3>

                <div className="checklist-form-row two-columns">
                  <label>
                    Department
                    <input
                      list="checklistDepartments"
                      value={form.department}
                      onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
                      placeholder="e.g. Branch Banking"
                      required
                    />
                    <datalist id="checklistDepartments">
                      {departments.map((department) => (
                        <option key={department} value={department} />
                      ))}
                    </datalist>
                  </label>

                  <label>
                    Checklist Name
                    <input
                      value={form.checklistName}
                      onChange={(event) => setForm((prev) => ({ ...prev, checklistName: event.target.value }))}
                      placeholder="e.g. Retail Branch Compliance"
                      required
                    />
                  </label>
                </div>

                <div className="checklist-form-row two-columns">
                  <label>
                    Checklist Scope
                    <input
                      list="checklistScopeOptions"
                      value={form.checklistScope}
                      onChange={(event) => setForm((prev) => ({ ...prev, checklistScope: event.target.value }))}
                      placeholder="e.g. Branch Based"
                    />
                    <datalist id="checklistScopeOptions">
                      <option value="branch" />
                      <option value="department" />
                      {departments.map((dept) => (
                        <option key={dept} value={dept} />
                      ))}
                    </datalist>
                  </label>

                  <label>
                    Status Criteria Mode
                    <select
                      value={form.statusMode}
                      onChange={(event) => setForm((prev) => ({ ...prev, statusMode: event.target.value }))}
                    >
                      <option value="global">One Criteria for All Segments</option>
                      <option value="segment">Different Criteria per Segment</option>
                    </select>
                  </label>
                </div>

                <div className="checklist-form-row two-columns">
                  <label>
                    Category Header
                    <input
                      value={form.categoryHeader}
                      onChange={(event) => setForm((prev) => ({ ...prev, categoryHeader: event.target.value }))}
                      placeholder="Category"
                    />
                  </label>

                  <label>
                    Sub Category Header
                    <input
                      value={form.subCategoryHeader}
                      onChange={(event) => setForm((prev) => ({ ...prev, subCategoryHeader: event.target.value }))}
                      placeholder="Sub Category"
                    />
                  </label>
                </div>

                  <div className="checklist-description-headers-block">
                    <div className="checklist-description-headers-head">
                      <p>Description Columns</p>
                      <Button type="button" variant="outline" onClick={addDescriptionHeader}>+ Add Description Column</Button>
                    </div>
                    {form.descriptionHeaders.length === 0 ? (
                      <p className="checklist-description-empty">No description columns added.</p>
                    ) : (
                      <div className="checklist-description-headers-list">
                        {form.descriptionHeaders.map((header, index) => (
                          <div key={`desc-header-${index}`} className="checklist-description-header-row">
                            <input
                              value={header}
                              onChange={(event) => updateDescriptionHeader(index, event.target.value)}
                              placeholder={`Description ${index + 1}`}
                            />
                            <button
                              type="button"
                              className="checklist-remove-btn"
                              onClick={() => removeDescriptionHeader(index)}
                              title="Remove description column"
                            >
                              ✖
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>

              <div className="checklist-form-segment">
                <h3 className="checklist-form-segment-title">Additional Columns</h3>

                <div className="checklist-toggle-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.includeWeightedScore}
                      onChange={(event) => setForm((prev) => ({ ...prev, includeWeightedScore: event.target.checked }))}
                    />
                    Enable Weighted Score
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.includeResponsibilities}
                      onChange={(event) => setForm((prev) => ({ ...prev, includeResponsibilities: event.target.checked }))}
                    />
                    Include Responsibilities
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.includeReviewedBy}
                      onChange={(event) => setForm((prev) => ({ ...prev, includeReviewedBy: event.target.checked }))}
                    />
                    Include Reviewed By
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.includeApprovedBy}
                      onChange={(event) => setForm((prev) => ({ ...prev, includeApprovedBy: event.target.checked }))}
                    />
                    Include Approved By
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.includeTimeline}
                      onChange={(event) => setForm((prev) => ({ ...prev, includeTimeline: event.target.checked }))}
                    />
                    Include Timeline
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.allowImage}
                      onChange={(event) => setForm((prev) => ({ ...prev, allowImage: event.target.checked }))}
                    />
                    Allow Picture Upload
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.allowVideo}
                      onChange={(event) => setForm((prev) => ({ ...prev, allowVideo: event.target.checked }))}
                    />
                    Allow Video Upload
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.allowAttachment}
                      onChange={(event) => setForm((prev) => ({ ...prev, allowAttachment: event.target.checked }))}
                    />
                    Allow Attachment Upload
                  </label>
                </div>
              </div>

              {form.includeResponsibilities && (
                <div className="checklist-responsibility-editor">
                  <div className="checklist-responsibility-header-row">
                    <p className="checklist-responsibility-label">Responsibilities</p>
                    <Button type="button" variant="outline" onClick={addAllDepartmentsAsResponsibilities}>
                      + Add All Departments
                    </Button>
                  </div>
                  <div className="checklist-responsibility-tags">
                    {form.responsibilities.map((resp, idx) => (
                      <span key={idx} className="checklist-resp-tag">
                        {resp}
                        <button type="button" className="checklist-resp-remove" onClick={() => removeResponsibility(idx)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="checklist-responsibility-add-row">
                    <div className="checklist-multiselect-dropdown">
                      <button
                        type="button"
                        className="checklist-multiselect-trigger"
                        onClick={() => setShowResponsibilityPicker((prev) => !prev)}
                      >
                        {responsibilitySelectValue.length
                          ? `${responsibilitySelectValue.filter((item) => item !== '__other__').length}${responsibilitySelectValue.includes('__other__') ? ' + Other' : ''} selected`
                          : 'Select responsibilities/departments'}
                      </button>
                      {showResponsibilityPicker && (
                        <div className="checklist-multiselect-menu">
                          {departments.map((department) => (
                            <label key={department} className="checklist-multiselect-option">
                              <input
                                type="checkbox"
                                checked={responsibilitySelectValue.includes(department)}
                                onChange={() => toggleResponsibilityOption(department)}
                              />
                              <span>{department}</span>
                            </label>
                          ))}
                          <label className="checklist-multiselect-option">
                            <input
                              type="checkbox"
                              checked={responsibilitySelectValue.includes('__other__')}
                              onChange={() => toggleResponsibilityOption('__other__')}
                            />
                            <span>Other</span>
                          </label>
                        </div>
                      )}
                    </div>
                    <small className="checklist-field-helper">Select multiple responsibilities from the dropdown.</small>
                    <button type="button" className="checklist-resp-add-btn" onClick={addSelectedResponsibilities}>+</button>
                  </div>
                  <div className="checklist-responsibility-add-row">
                    <input
                      value={responsibilityInput}
                      onChange={(event) => setResponsibilityInput(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addResponsibility(); } }}
                      placeholder={responsibilitySelectValue.includes('__other__') ? 'Type custom responsibility' : 'Add custom responsibility'}
                    />
                    <button type="button" className="checklist-resp-add-btn" onClick={addResponsibility}>+</button>
                  </div>
                </div>
              )}

              {(form.includeReviewedBy || form.includeApprovedBy) && (
                <div className="checklist-form-row two-columns">
                  {form.includeReviewedBy ? (
                    <label>
                      Reviewed By Label
                      <input
                        value={form.reviewedBy}
                        onChange={(event) => setForm((prev) => ({ ...prev, reviewedBy: event.target.value }))}
                        placeholder="Reviewer designation"
                      />
                    </label>
                  ) : <div />}

                  {form.includeApprovedBy ? (
                    <label>
                      Approved By Label
                      <input
                        value={form.approvedBy}
                        onChange={(event) => setForm((prev) => ({ ...prev, approvedBy: event.target.value }))}
                        placeholder="Approver designation"
                      />
                    </label>
                  ) : <div />}
                </div>
              )}

              <div className="checklist-items-block">
                <div className="checklist-items-header">
                  <h3>Checklist Segments</h3>
                  <div className="checklist-items-header-actions">
                    <Button type="button" variant="outline" onClick={downloadCsvTemplate}>Download CSV</Button>
                    <label className="checklist-csv-upload">
                      Upload CSV
                      <input type="file" accept=".csv" onChange={handleCsvUpload} />
                    </label>
                  </div>
                </div>

                {form.statusMode === 'global' && (
                  <div className="checklist-global-status-block">
                    <label>
                      Common Status Options (comma-separated)
                      <input
                        value={form.globalStatuses}
                        onChange={(event) => setForm((prev) => ({ ...prev, globalStatuses: event.target.value }))}
                        placeholder="Yes, No, NA"
                      />
                    </label>
                  </div>
                )}

                {form.includeWeightedScore && availableStatuses.length > 0 && (
                  <div className="checklist-status-rules-block">
                    <h4>Weighted Score Rules</h4>
                    <p>Set how each status impacts weighted score. Use negative values for penalties (e.g. -10).</p>
                    <div className="checklist-status-rules-list">
                      {availableStatuses.map((status) => {
                        const currentRule = (form.statusScoreRules || []).find((rule) => rule.status === status) || {
                          status,
                          value: 0,
                          type: 'percentage'
                        };

                        return (
                          <div key={status} className="checklist-status-rule-row">
                            <span className="checklist-status-rule-name">{status}</span>
                            <input
                              type="number"
                              step="0.01"
                              value={currentRule.value}
                              onChange={(event) => updateStatusRule(status, 'value', event.target.value)}
                              placeholder="Value"
                            />
                            <select
                              value={currentRule.type || 'percentage'}
                              onChange={(event) => updateStatusRule(status, 'type', event.target.value)}
                            >
                              <option value="percentage">% of weight</option>
                              <option value="fixed">Fixed score</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.items.map((item, index) => (
                  <div
                    key={`item-${index}`}
                    className="checklist-item-row"
                    style={{
                      '--checklist-item-columns': `1fr 1fr ${form.descriptionHeaders.map(() => '1fr').join(' ')} 1fr ${form.includeWeightedScore ? '120px' : ''} auto`
                    }}
                  >
                    <input
                      value={item.category}
                      onChange={(event) => updateItem(index, 'category', event.target.value)}
                      placeholder={form.categoryHeader || 'Category'}
                      required
                    />
                    <input
                      value={item.subCategory}
                      onChange={(event) => updateItem(index, 'subCategory', event.target.value)}
                      placeholder={form.subCategoryHeader || 'Sub Category'}
                    />
                    {form.descriptionHeaders.map((header, descriptionIndex) => (
                      <input
                        key={`desc-${index}-${descriptionIndex}`}
                        value={item.descriptionValues?.[descriptionIndex] || ''}
                        onChange={(event) => updateItemDescription(index, descriptionIndex, event.target.value)}
                        placeholder={header || `Description ${descriptionIndex + 1}`}
                      />
                    ))}
                    <input
                      value={item.statusOptions}
                      onChange={(event) => updateItem(index, 'statusOptions', event.target.value)}
                      placeholder={form.statusMode === 'segment' ? 'Status options for this segment (comma-separated)' : 'Auto from common statuses'}
                      disabled={form.statusMode !== 'segment'}
                    />
                    {form.includeWeightedScore && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.weightScore}
                        onChange={(event) => updateItem(index, 'weightScore', event.target.value)}
                        placeholder="Weight"
                        required
                      />
                    )}
                    <div className="checklist-item-row-actions">
                      <button
                        type="button"
                        className="checklist-row-move-btn"
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="checklist-row-move-btn"
                        onClick={() => moveItem(index, 1)}
                        disabled={index === form.items.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="checklist-remove-btn"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1}
                        title="Remove segment"
                      >
                        ✖
                      </button>
                    </div>
                  </div>
                ))}

                {form.includeWeightedScore && (
                  <div className="checklist-score-summary">
                    <strong>Total Assigned Score:</strong> {totalAssignedScore.toFixed(2)}
                  </div>
                )}

                <div className="checklist-items-footer-actions">
                  <Button type="button" variant="outline" onClick={addItem}>+ Add Segment</Button>
                </div>
              </div>

              <div className="checklist-actions">
                <Button type="submit" variant="primary" loading={saving}>
                  {editingTemplateId ? 'Update Template' : 'Create Template'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChecklistManager;
