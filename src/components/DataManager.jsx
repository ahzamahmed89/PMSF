import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from './Button';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import '../styles/DataManager.css';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:5000/api`,
  timeout: 10000
});

const DataManager = () => {
  const [data, setData] = useState([]);
  const [newRecord, setNewRecord] = useState({
    MasterCat: '',
    Category: '',
    Activity: '',
    Weightage: 0,
    Remarks: '',
    V_Status: '',
    Responsibility: '',
    check_Status: ''
  });
  const [editingCode, setEditingCode] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [selectedMasterCat, setSelectedMasterCat] = useState('');
  const [masterCatOrder, setMasterCatOrder] = useState([]);
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [renamingMasterCat, setRenamingMasterCat] = useState(null);
  const [newMasterCatName, setNewMasterCatName] = useState('');
  const [renamingCategory, setRenamingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // Drag and drop state
  const [draggedMasterCatIndex, setDraggedMasterCatIndex] = useState(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState(null);
  const [draggedRecordIndex, setDraggedRecordIndex] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Update master categories when data changes (maintain insertion order, no sort)
  useEffect(() => {
    if (data.length > 0) {
      const unique = getUniqueMasterCats();
      setMasterCatOrder(unique);
    }
  }, [data]);

  // Update categories when data or selected master cat changes (maintain insertion order, no sort)
  useEffect(() => {
    if (selectedMasterCat) {
      const cats = getUniqueCategories(selectedMasterCat);
      setCategoryOrder(cats);
    }
  }, [data, selectedMasterCat]);

  // Get unique master categories in insertion order
  const getUniqueMasterCats = () => {
    const unique = [];
    const seen = new Set();
    data.forEach(item => {
      if (!seen.has(item.MasterCat) && item.MasterCat) {
        unique.push(item.MasterCat);
        seen.add(item.MasterCat);
      }
    });
    return unique;
  };

  // Get unique categories for selected master cat in insertion order
  const getUniqueCategories = (masterCat) => {
    const unique = [];
    const seen = new Set();
    data.forEach(item => {
      if (item.MasterCat === masterCat && !seen.has(item.Category) && item.Category) {
        unique.push(item.Category);
        seen.add(item.Category);
      }
    });
    return unique;
  };

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: result } = await api.get('/pmsf-master');
      setData(result);
      setError(null);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new record to local state (not backend yet)
  const handleAddRecord = (e) => {
    e.preventDefault();
    if (!newRecord.MasterCat || !newRecord.Category || !newRecord.Activity || !newRecord.Weightage||!newRecord.V_Status) {
      alert('Master Category and Category are required');
      return;
    }

    // Create new entry with temporary Code (negative ID for new records)
    const tempCode = Math.min(...data.map(d => d.Code || 0), 0) - 1;
    const newEntry = {
      Code: tempCode,
      MasterCat: newRecord.MasterCat,
      Category: newRecord.Category,
      Activity: newRecord.Activity || '',
      Weightage: Number(newRecord.Weightage) || 0,
      Remarks: newRecord.Remarks || '',
      V_Status: newRecord.V_Status || 'NA',
      Responsibility: newRecord.Responsibility || '',
      check_Status: 'active'
    };

    // Find correct insertion position
    let insertIndex = data.length; // default: end of list
    
    // Check if MasterCat exists
    const masterCatExists = data.some(d => d.MasterCat === newRecord.MasterCat);
    
    if (masterCatExists) {
      // Check if Category exists within this MasterCat
      const categoryExists = data.some(d => 
        d.MasterCat === newRecord.MasterCat && d.Category === newRecord.Category
      );
      
      if (categoryExists) {
        // Insert at end of same category group
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i].MasterCat === newRecord.MasterCat && 
              data[i].Category === newRecord.Category) {
            insertIndex = i + 1;
            break;
          }
        }
      } else {
        // Insert at end of same master cat group
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i].MasterCat === newRecord.MasterCat) {
            insertIndex = i + 1;
            break;
          }
        }
      }
    }
    // else: new MasterCat, insert at end (insertIndex already set)

    const newData = [...data];
    newData.splice(insertIndex, 0, newEntry);
    setData(newData);
    
    // Show notification
    setNotification('Record added successfully! Click "Submit All Changes" to save.');
    setTimeout(() => setNotification(null), 3000);
    
    // Reset form
    setNewRecord({
      MasterCat: '',
      Category: '',
      Activity: '',
      Weightage: 0,
      Remarks: '',
      V_Status: '',
      Responsibility: '',
      check_Status: ''
    });
  };

  // Update record
  const handleUpdateRecord = async (code, updatedRecord) => {
    try {
      await api.put(`/pmsf-master/${code}`, updatedRecord);

      setEditingCode(null);
      fetchData();
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
    }
  };

  // Delete record
  const handleDeleteRecord = async (code) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      // Update check_status to 'deleted' instead of actually deleting
      const updatedData = data.map(item =>
        item.Code === code ? { ...item, check_Status: 'deleted' } : item
      );
      setData(updatedData);
      if (editingCode === code) {
        setEditingCode(null);
        setEditingData({});
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUndoDelete = (code) => {
    setData(prev => prev.map(item =>
      item.Code === code ? { ...item, check_Status: 'active' } : item
    ));
  };

  // Move record up or down
  const handleMoveRecord = (index, direction) => {
    const newData = [...data];
    if (direction === 'up' && index > 0) {
      [newData[index], newData[index - 1]] = [newData[index - 1], newData[index]];
    } else if (direction === 'down' && index < newData.length - 1) {
      [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
    }
    setData(newData);
  };

  // Rename master category
  const handleRenameMasterCat = async (oldName) => {
    if (!newMasterCatName.trim()) {
      alert('New name cannot be empty');
      return;
    }

    try {
      const updatedData = data.map(item =>
        item.MasterCat === oldName ? { ...item, MasterCat: newMasterCatName } : item
      );

      setData(updatedData);
      setRenamingMasterCat(null);
      setNewMasterCatName('');
    } catch (err) {
      setError(err.message);
    }
  };

  // Rename category
  const handleRenameCategory = async (oldName) => {
    if (!newCategoryName.trim()) {
      alert('New name cannot be empty');
      return;
    }

    try {
      const updatedData = data.map(item =>
        item.Category === oldName && item.MasterCat === selectedMasterCat
          ? { ...item, Category: newCategoryName }
          : item
      );

      setData(updatedData);
      setRenamingCategory(null);
      setNewCategoryName('');
    } catch (err) {
      setError(err.message);
    }
  };

  // Move master category up - swap entire groups
  const handleMoveMasterCatUp = (currentIndex) => {
    setData(prevData => {
      const newData = [...prevData];
      const uniqueMasterCats = [];
      const seen = new Set();
      newData.forEach(item => {
        if (!seen.has(item.MasterCat) && item.MasterCat) {
          uniqueMasterCats.push(item.MasterCat);
          seen.add(item.MasterCat);
        }
      });
      
      const currentMasterCat = uniqueMasterCats[currentIndex];
      const prevMasterCat = uniqueMasterCats[currentIndex - 1];
      
      // Find all indices of current and previous master cats
      const currentIndices = [];
      const prevIndices = [];
      
      newData.forEach((item, idx) => {
        if (item.MasterCat === currentMasterCat) currentIndices.push(idx);
        if (item.MasterCat === prevMasterCat) prevIndices.push(idx);
      });
      
      // Swap all entries: current group moves to where previous group was
      if (prevIndices.length > 0 && currentIndices.length > 0) {
        const prevStartIdx = prevIndices[0];
        const prevEndIdx = prevIndices[prevIndices.length - 1];
        const currStartIdx = currentIndices[0];
        const currEndIdx = currentIndices[currentIndices.length - 1];
        
        // Extract groups
        const prevGroup = newData.splice(prevStartIdx, prevIndices.length);
        const currGroup = newData.splice(currentIndices[0] - prevIndices.length, currentIndices.length);
        
        // Reinsert swapped
        newData.splice(prevStartIdx, 0, ...currGroup);
        newData.splice(prevStartIdx + currGroup.length, 0, ...prevGroup);
      }
      
      return newData;
    });
  };

  // Move master category down - swap entire groups
  const handleMoveMasterCatDown = (currentIndex) => {
    setData(prevData => {
      const newData = [...prevData];
      const uniqueMasterCats = [];
      const seen = new Set();
      newData.forEach(item => {
        if (!seen.has(item.MasterCat) && item.MasterCat) {
          uniqueMasterCats.push(item.MasterCat);
          seen.add(item.MasterCat);
        }
      });
      
      const currentMasterCat = uniqueMasterCats[currentIndex];
      const nextMasterCat = uniqueMasterCats[currentIndex + 1];
      
      // Find all indices of current and next master cats
      const currentIndices = [];
      const nextIndices = [];
      
      newData.forEach((item, idx) => {
        if (item.MasterCat === currentMasterCat) currentIndices.push(idx);
        if (item.MasterCat === nextMasterCat) nextIndices.push(idx);
      });
      
      // Swap all entries: current group moves to where next group was
      if (nextIndices.length > 0 && currentIndices.length > 0) {
        const currStartIdx = currentIndices[0];
        const nextStartIdx = nextIndices[0];
        
        // Extract groups
        const currGroup = newData.splice(currStartIdx, currentIndices.length);
        const nextGroup = newData.splice(nextStartIdx - currentIndices.length, nextIndices.length);
        
        // Reinsert swapped
        newData.splice(currStartIdx, 0, ...nextGroup);
        newData.splice(currStartIdx + nextGroup.length, 0, ...currGroup);
      }
      
      return newData;
    });
  };

  // Move category up - swap entire groups
  const handleMoveCategoryUp = (currentIndex) => {
    setData(prevData => {
      const newData = [...prevData];
      const uniqueCategories = [];
      const seen = new Set();
      newData.forEach(item => {
        if (item.MasterCat === selectedMasterCat && !seen.has(item.Category) && item.Category) {
          uniqueCategories.push(item.Category);
          seen.add(item.Category);
        }
      });
      
      const currentCategory = uniqueCategories[currentIndex];
      const prevCategory = uniqueCategories[currentIndex - 1];
      
      // Find all indices for current and previous categories
      const currentIndices = [];
      const prevIndices = [];
      newData.forEach((item, idx) => {
        if (item.MasterCat === selectedMasterCat && item.Category === currentCategory) currentIndices.push(idx);
        if (item.MasterCat === selectedMasterCat && item.Category === prevCategory) prevIndices.push(idx);
      });
      
      // Swap entire groups
      if (prevIndices.length > 0 && currentIndices.length > 0) {
        const prevStartIdx = prevIndices[0];
        
        // Extract groups
        const prevGroup = newData.splice(prevStartIdx, prevIndices.length);
        const currGroup = newData.splice(currentIndices[0] - prevIndices.length, currentIndices.length);
        
        // Reinsert swapped
        newData.splice(prevStartIdx, 0, ...currGroup);
        newData.splice(prevStartIdx + currGroup.length, 0, ...prevGroup);
      }
      
      return newData;
    });
  };

  // Move category down - swap entire groups
  const handleMoveCategoryDown = (currentIndex) => {
    setData(prevData => {
      const newData = [...prevData];
      const uniqueCategories = [];
      const seen = new Set();
      newData.forEach(item => {
        if (item.MasterCat === selectedMasterCat && !seen.has(item.Category) && item.Category) {
          uniqueCategories.push(item.Category);
          seen.add(item.Category);
        }
      });
      
      const currentCategory = uniqueCategories[currentIndex];
      const nextCategory = uniqueCategories[currentIndex + 1];
      
      // Find all indices for current and next categories
      const currentIndices = [];
      const nextIndices = [];
      newData.forEach((item, idx) => {
        if (item.MasterCat === selectedMasterCat && item.Category === currentCategory) currentIndices.push(idx);
        if (item.MasterCat === selectedMasterCat && item.Category === nextCategory) nextIndices.push(idx);
      });
      
      // Swap entire groups
      if (nextIndices.length > 0 && currentIndices.length > 0) {
        const currStartIdx = currentIndices[0];
        const nextStartIdx = nextIndices[0];
        
        // Extract groups
        const currGroup = newData.splice(currStartIdx, currentIndices.length);
        const nextGroup = newData.splice(nextStartIdx - currentIndices.length, nextIndices.length);
        
        // Reinsert swapped
        newData.splice(currStartIdx, 0, ...nextGroup);
        newData.splice(currStartIdx + nextGroup.length, 0, ...currGroup);
      }
      
      return newData;
    });
  };

  // Drag and Drop Handlers for Master Categories
  const handleDragStartMasterCat = (e, index) => {
    setDraggedMasterCatIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEndMasterCat = (e) => {
    e.target.style.opacity = '';
    setDraggedMasterCatIndex(null);
  };

  const handleDragOverMasterCat = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropMasterCat = (e, dropIndex) => {
    e.preventDefault();
    if (draggedMasterCatIndex === null || draggedMasterCatIndex === dropIndex) return;

    const dragIndex = draggedMasterCatIndex;
    setData(prevData => {
      const newData = [...prevData];
      const uniqueMasterCats = [];
      const seen = new Set();
      newData.forEach(item => {
        if (!seen.has(item.MasterCat) && item.MasterCat) {
          uniqueMasterCats.push(item.MasterCat);
          seen.add(item.MasterCat);
        }
      });

      const dragMasterCat = uniqueMasterCats[dragIndex];
      const dropMasterCat = uniqueMasterCats[dropIndex];

      // Find all records for both master categories
      const dragRecords = newData.filter(item => item.MasterCat === dragMasterCat);
      const dropRecords = newData.filter(item => item.MasterCat === dropMasterCat);

      // Remove drag records from array
      const filtered = newData.filter(item => item.MasterCat !== dragMasterCat);

      // Find insertion point (where drop master cat starts)
      const insertIndex = filtered.findIndex(item => item.MasterCat === dropMasterCat);

      if (dragIndex < dropIndex) {
        // Moving down - insert after drop group
        const dropEndIndex = insertIndex + dropRecords.length;
        filtered.splice(dropEndIndex, 0, ...dragRecords);
      } else {
        // Moving up - insert before drop group
        filtered.splice(insertIndex, 0, ...dragRecords);
      }

      return filtered;
    });
  };

  // Drag and Drop Handlers for Categories
  const handleDragStartCategory = (e, index) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEndCategory = (e) => {
    e.target.style.opacity = '';
    setDraggedCategoryIndex(null);
  };

  const handleDragOverCategory = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropCategory = (e, dropIndex) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === dropIndex) return;

    const dragIndex = draggedCategoryIndex;
    setData(prevData => {
      const newData = [...prevData];
      const uniqueCategories = [];
      const seen = new Set();
      newData.forEach(item => {
        if (item.MasterCat === selectedMasterCat && !seen.has(item.Category) && item.Category) {
          uniqueCategories.push(item.Category);
          seen.add(item.Category);
        }
      });

      const dragCategory = uniqueCategories[dragIndex];
      const dropCategory = uniqueCategories[dropIndex];

      // Find all records for both categories
      const dragRecords = newData.filter(item => item.Category === dragCategory && item.MasterCat === selectedMasterCat);
      const dropRecords = newData.filter(item => item.Category === dropCategory && item.MasterCat === selectedMasterCat);

      // Remove drag records
      const filtered = newData.filter(item => !(item.Category === dragCategory && item.MasterCat === selectedMasterCat));

      // Find insertion point
      const insertIndex = filtered.findIndex(item => item.Category === dropCategory && item.MasterCat === selectedMasterCat);

      if (dragIndex < dropIndex) {
        const dropEndIndex = insertIndex + dropRecords.length;
        filtered.splice(dropEndIndex, 0, ...dragRecords);
      } else {
        filtered.splice(insertIndex, 0, ...dragRecords);
      }

      return filtered;
    });
  };

  // Drag and Drop Handlers for Records/Activities
  const handleDragStartRecord = (e, index) => {
    setDraggedRecordIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEndRecord = (e) => {
    e.currentTarget.style.opacity = '';
    setDraggedRecordIndex(null);
  };

  const handleDragOverRecord = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropRecord = (e, dropIndex) => {
    e.preventDefault();
    if (draggedRecordIndex === null || draggedRecordIndex === dropIndex) return;

    const dragIndex = draggedRecordIndex;
    const newData = [...data];
    const [draggedItem] = newData.splice(dragIndex, 1);
    newData.splice(dropIndex, 0, draggedItem);
    setData(newData);
  };

  // Submit all changes to backend
  const handleSubmitAll = async () => {
    try {
      // Step 1: Separate active and deleted records
      const activeRecords = data.filter(d => d.check_Status !== 'deleted');
      const deletedRecords = data.filter(d => d.check_Status === 'deleted');
      
      // Step 2: Re-index active records starting from 1
      const reindexedActive = activeRecords.map((record, index) => ({
        ...record,
        Indexing: index + 1
      }));
      
      // Step 3: Set deleted records to Indexing 0
      const reindexedDeleted = deletedRecords.map(record => ({
        ...record,
        Indexing: 0
      }));
      
      // Step 4: Separate new entries (negative Code) from existing
      const allRecords = [...reindexedActive, ...reindexedDeleted];
      const existingRecords = allRecords.filter(r => r.Code > 0);
      const newRecords = allRecords.filter(r => r.Code < 0);
      
      // Step 5: Insert new records first (database will auto-assign Codes)
      for (const record of newRecords) {
        await api.post('/pmsf-master', {
          MasterCat: record.MasterCat,
          Category: record.Category,
          Activity: record.Activity,
          Weightage: record.Weightage,
          Remarks: record.Remarks,
          Responsibility: record.Responsibility,
          V_Status: record.V_Status,
          check_Status: record.check_Status,
          Indexing: record.Indexing
        });
      }
      
      // Step 6: Update existing records
      if (existingRecords.length > 0) {
        await api.put('/pmsf-master/bulk-update', existingRecords);
      }
      
      alert('All changes submitted successfully');
      await fetchData();
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
      alert(`Error: ${message}`);
    }
  };

  if (loading) return <LoadingSpinner text="Loading checklist data..." fullPage />;
  if (error) return (
    <div className="container">
      <ErrorMessage message={error} type="error" />
    </div>
  );

  return (
    <div className="container">
      <div className="header-with-back">
        <Button 
          variant="back"
          onClick={() => window.location.href = '/'}
          icon="←"
          className="btn-back"
        >
          Back Home
        </Button>
        <h1 className="checklist-title">Checklist Manager</h1>
      </div>
      
      {/* Notification */}
      {notification && (
        <ErrorMessage 
          message={notification}
          type="success"
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Add New Record Section */}
      <section className="section">
        <h2>Add New Record</h2>
        <form onSubmit={handleAddRecord} className="form">
          <div className="form-row">
            <div className="form-group">
              <label>Master Category *</label>
              <input
                list="masterCatList"
                type="text"
                value={newRecord.MasterCat}
                onChange={(e) => setNewRecord({ ...newRecord, MasterCat: e.target.value })}
                placeholder="Select or type..."
                required
              />
              <datalist id="masterCatList">
                {getUniqueMasterCats().map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input
                list="categoryList"
                type="text"
                value={newRecord.Category}
                onChange={(e) => setNewRecord({ ...newRecord, Category: e.target.value })}
                placeholder="Select or type..."
                required
              />
              <datalist id="categoryList">
                {getUniqueCategories(newRecord.MasterCat || '').map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Activity</label>
              <input
                type="text"
                value={newRecord.Activity}
                onChange={(e) => setNewRecord({ ...newRecord, Activity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Weightage</label>
              <input
                type="number"
                step="0.01"
                value={newRecord.Weightage}
                onChange={(e) => setNewRecord({ ...newRecord, Weightage: parseFloat(e.target.value) })}
                required
              />
            </div>
            <FormSelect
              label="Default Status"
              value={newRecord.V_Status}
              onChange={(e) => setNewRecord({ ...newRecord, V_Status: e.target.value })}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
                { value: 'NA', label: 'NA' }
              ]}
              placeholder="-- Select Status --"
              required
            />
          </div>

          <Button type="submit" variant="primary" className="btn-add-form">Add Record</Button>
        </form>
      </section>

      {/* Manage Master Categories & Categories Section */}
      <section className="section">
        <div className="management-header">
          <div className="management-column">
            <h2>Master Categories</h2>
            <div className="management-list">
              {masterCatOrder.length === 0 ? (
                <p>No master categories found</p>
              ) : (
                masterCatOrder.map((masterCat, index) => (
                  <div 
                    key={`${index}-${masterCat}`} 
                    className="management-item"
                    draggable
                    onDragStart={(e) => handleDragStartMasterCat(e, index)}
                    onDragEnd={handleDragEndMasterCat}
                    onDragOver={handleDragOverMasterCat}
                    onDrop={(e) => handleDropMasterCat(e, index)}
                    style={{ cursor: 'move' }}
                  >
                    {renamingMasterCat === masterCat ? (
                      <div className="rename-container">
                        <input
                          type="text"
                          className="rename-input"
                          value={newMasterCatName}
                          onChange={(e) => setNewMasterCatName(e.target.value)}
                          placeholder={masterCat}
                          autoFocus
                        />
                        <button type="button" className="btn-save-small" onClick={() => handleRenameMasterCat(masterCat)}>Save</button>
                        <button type="button" className="btn-cancel-small" onClick={() => { setRenamingMasterCat(null); setNewMasterCatName(''); }}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span className="item-name">{masterCat}</span>
                        <div className="button-group">
                          {index > 0 && (
                            <button
                              type="button"
                              className="btn-icon btn-icon-move"
                              onClick={() => handleMoveMasterCatUp(index)}
                              title="Move Up"
                            >
                              ⬆️
                            </button>
                          )}
                          {index < masterCatOrder.length - 1 && (
                            <button
                              type="button"
                              className="btn-icon btn-icon-move"
                              onClick={() => handleMoveMasterCatDown(index)}
                              title="Move Down"
                            >
                              ⬇️
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-rename"
                            onClick={() => { setRenamingMasterCat(masterCat); setNewMasterCatName(masterCat); }}
                          >
                            Rename
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="management-column">
            <h2>Categories</h2>
            <div className="form-group-inline">
              <select
                value={selectedMasterCat}
                onChange={(e) => setSelectedMasterCat(e.target.value)}
              >
                <option value="">Select Master Category</option>
                {masterCatOrder.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {selectedMasterCat && (
              <div className="management-list">
                {categoryOrder.length === 0 ? (
                  <p>No categories found</p>
                ) : (
                  categoryOrder.map((category, index) => (
                    <div 
                      key={`${index}-${category}`} 
                      className="management-item"
                      draggable
                      onDragStart={(e) => handleDragStartCategory(e, index)}
                      onDragEnd={handleDragEndCategory}
                      onDragOver={handleDragOverCategory}
                      onDrop={(e) => handleDropCategory(e, index)}
                      style={{ cursor: 'move' }}
                    >
                      {renamingCategory === category ? (
                        <div className="rename-container">
                          <input
                            type="text"
                            className="rename-input"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder={category}
                            autoFocus
                          />
                          <button type="button" className="btn-save-small" onClick={() => handleRenameCategory(category)}>Save</button>
                          <button type="button" className="btn-cancel-small" onClick={() => { setRenamingCategory(null); setNewCategoryName(''); }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span className="item-name">{category}</span>
                          <div className="button-group">
                            {index > 0 && (
                              <button
                                type="button"
                                className="btn-icon btn-icon-move"
                                onClick={() => handleMoveCategoryUp(index)}
                                title="Move Up"
                              >
                                ⬆️
                              </button>
                            )}
                            {index < categoryOrder.length - 1 && (
                              <button
                                type="button"
                                className="btn-icon btn-icon-move"
                                onClick={() => handleMoveCategoryDown(index)}
                                title="Move Down"
                              >
                                ⬇️
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-rename"
                              onClick={() => { setRenamingCategory(category); setNewCategoryName(category); }}
                            >
                              Rename
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Existing Records Table */}
      <section className="section">
        <h2>Existing Records</h2>
        <div className="weightage-summary">
          <strong>Total Weightage:</strong> <span>{data.reduce((sum, d) => sum + (d.Weightage || 0), 0).toFixed(2)}</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Master Category</th>
                <th>Category</th>
                <th>Activity</th>
                <th>Weightage</th>
                <th>Current Status</th>
                <th>Default Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const isDeleted = item.check_Status === 'deleted';
                const isEditing = editingCode === item.Code && !isDeleted;
                return (
                  <tr 
                    key={item.Code} 
                    className={isDeleted ? 'row-deleted' : ''}
                    draggable={!isDeleted && !isEditing}
                    onDragStart={(e) => handleDragStartRecord(e, index)}
                    onDragEnd={handleDragEndRecord}
                    onDragOver={handleDragOverRecord}
                    onDrop={(e) => handleDropRecord(e, index)}
                    style={{ cursor: !isDeleted && !isEditing ? 'move' : 'default' }}
                  >
                    <td>{isEditing ? <input type="text" value={editingData.MasterCat || ''} onChange={(e) => setEditingData({ ...editingData, MasterCat: e.target.value })} /> : item.MasterCat}</td>
                    <td>{isEditing ? <input type="text" value={editingData.Category || ''} onChange={(e) => setEditingData({ ...editingData, Category: e.target.value })} /> : item.Category}</td>
                    <td>{isEditing ? <input type="text" value={editingData.Activity || ''} onChange={(e) => setEditingData({ ...editingData, Activity: e.target.value })} /> : item.Activity}</td>
                    <td>{isEditing ? <input type="number" step="0.01" value={editingData.Weightage || 0} onChange={(e) => setEditingData({ ...editingData, Weightage: parseFloat(e.target.value) })} /> : item.Weightage}</td>
                    <td>
                      {isDeleted ? (
                        <span className="status-badge status-deleted">Deleted (pending)</span>
                      ) : (
                        <span className="status-badge status-active">{item.check_Status || 'active'}</span>
                      )}
                    </td>
                    <td>{isEditing ? <select value={editingData.V_Status || ''} onChange={(e) => setEditingData({ ...editingData, V_Status: e.target.value })}><option value="">-- Select --</option><option value="Yes">Yes</option><option value="No">No</option><option value="NA">NA</option></select> : item.V_Status}</td>
                    <td className="table-actions">
                      {!isDeleted && !isEditing && (
                        <>
                          {/* Dropdown for small screens */}
                          <div className="dropdown-menu-actions">
                            <button type="button" className="btn-actions-dropdown" title="Actions">⋮</button>
                            <div className="dropdown-actions-content">
                              {index > 0 && (
                                <button
                                  type="button"
                                  className="dropdown-action-item"
                                  onClick={() => handleMoveRecord(index, 'up')}
                                >
                                  ⬆️ Move Up
                                </button>
                              )}
                              {index < data.length - 1 && (
                                <button
                                  type="button"
                                  className="dropdown-action-item"
                                  onClick={() => handleMoveRecord(index, 'down')}
                                >
                                  ⬇️ Move Down
                                </button>
                              )}
                              <button
                                type="button"
                                className="dropdown-action-item"
                                onClick={() => {
                                  setEditingCode(item.Code);
                                  setEditingData({ ...item });
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className="dropdown-action-item dropdown-action-delete"
                                onClick={() => handleDeleteRecord(item.Code)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                          
                          {/* Buttons for large screens */}
                          <div className="button-group-actions">
                            {index > 0 && (
                              <button
                                className="btn-icon btn-icon-move"
                                onClick={() => handleMoveRecord(index, 'up')}
                                title="Move Up"
                              >
                                ⬆️
                              </button>
                            )}
                            {index < data.length - 1 && (
                              <button
                                className="btn-icon btn-icon-move"
                                onClick={() => handleMoveRecord(index, 'down')}
                                title="Move Down"
                              >
                                ⬇️
                              </button>
                            )}
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditingCode(item.Code);
                                setEditingData({ ...item });
                              }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon btn-icon-delete"
                              onClick={() => handleDeleteRecord(item.Code)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </>
                      )}
                      {isDeleted && (
                        <button className="btn-undo" onClick={() => handleUndoDelete(item.Code)} title="Undo delete">↶ Undo</button>
                      )}
                      {isEditing && (
                        <div className="button-group-inline">
                          <button className="btn-icon" onClick={() => {
                            const updatedData = data.map(d => d.Code === item.Code ? { ...d, ...editingData } : d);
                            setData(updatedData);
                            setEditingCode(null);
                            setEditingData({});
                          }} title="Accept">✓</button>
                          <button className="btn-icon" onClick={() => {
                            setEditingCode(null);
                            setEditingData({});
                          }} title="Cancel">✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Submit Button */}
      <div className="submit-section">
        <Button
          variant="success"
          size="large"
          onClick={handleSubmitAll}
        >
          Submit All Changes
        </Button>
      </div>
    </div>
  );
};

export default DataManager;
