import { getPool } from '../config/database.js'
import sql from 'mssql'

// Normalize weight to a number; default to 0 if invalid
const normalizeWeight = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

// Normalize V_Status to a safe default
const normalizeStatus = (value) => (value && value.trim() ? value.trim() : 'NA')

export const getPMSFMaster = async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT Code, MasterCat, Category, Activity, Remarks, 
             Weightage, V_Status, Responsibility, check_Status,
             CreatedOn, CreatedBy, Indexing 
      FROM PMSFMaster
      WHERE check_Status = 'active'
      ORDER BY Indexing
    `)
    res.json(result.recordset)
  } catch (error) {
    console.error('Error fetching PMSFMaster:', error)
    res.status(500).json({ error: 'Failed to fetch PMSFMaster data' })
  }
}

// Add new record
export const addPMSFMaster = async (req, res) => {
  try {
    console.log('=== ADD RECORD REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { MasterCat, Category, Activity = '', Weightage, Remarks, Responsibility, V_Status, Indexing } = req.body

    if (!MasterCat || !Category) {
      return res.status(400).json({ error: 'MasterCat and Category are required' })
    }

    const pool = await getPool()
    const weightValue = normalizeWeight(Weightage)
    const vStatus = normalizeStatus(V_Status)
    const indexValue = parseInt(Indexing, 10) || 0
    
    // Get next available Code with retry logic to handle concurrent inserts
    let nextCode = null
    let attempts = 0
    const maxAttempts = 5
    
    while (attempts < maxAttempts) {
      // Get max Code
      const maxCodeResult = await pool.request().query('SELECT ISNULL(MAX(Code), 0) + 1 as NextCode FROM PMSFMaster')
      nextCode = maxCodeResult.recordset[0].NextCode
      
      // Check if this Code is already taken
      const checkResult = await pool.request()
        .input('CheckCode', sql.Int, nextCode)
        .query('SELECT COUNT(*) as Count FROM PMSFMaster WHERE Code = @CheckCode')
      
      if (checkResult.recordset[0].Count === 0) {
        // Code is available
        break
      }
      
      console.log(`Code ${nextCode} already exists, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to find available Code after multiple attempts')
      }
    }
    
    console.log('Processed values:');
    console.log('- Code (auto-assigned):', nextCode);
    console.log('- MasterCat:', MasterCat);
    console.log('- Category:', Category);
    console.log('- Activity:', Activity || '');
    console.log('- Weightage:', weightValue);
    console.log('- Remarks:', Remarks && Remarks.trim() ? Remarks : null);
    console.log('- Responsibility:', Responsibility && Responsibility.trim() ? Responsibility : null);
    console.log('- V_Status:', vStatus);
    console.log('- Indexing:', indexValue);
    
    await pool.request()
      .input('Code', sql.Int, nextCode)
      .input('MasterCat', sql.VarChar(100), MasterCat)
      .input('Category', sql.VarChar(100), Category)
      .input('Activity', sql.VarChar(150), Activity || '')
      .input('Weightage', sql.Decimal(5, 2), weightValue)
      .input('Remarks', sql.VarChar(255), Remarks && Remarks.trim() ? Remarks : null)
      .input('Responsibility', sql.VarChar(25), Responsibility && Responsibility.trim() ? Responsibility : null)
      .input('V_Status', sql.VarChar(10), vStatus)
      .input('Indexing', sql.Int, indexValue)
      .query(`
        INSERT INTO PMSFMaster 
        (Code, MasterCat, Category, Activity, Weightage, Remarks, Responsibility, V_Status, check_Status, Indexing, CreatedOn, CreatedBy)
        VALUES (@Code, @MasterCat, @Category, @Activity, @Weightage, @Remarks, @Responsibility, @V_Status, 'active', @Indexing, GETDATE(), SYSTEM_USER)
      `)
    
    console.log('Record added successfully, Code:', nextCode);
    res.json({ message: 'Record added successfully', Code: nextCode })
  } catch (error) {
    console.error('Error adding record:', error)
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    res.status(500).json({ error: 'Failed to add record', details: error.message })
  }
}

// Update record
export const updatePMSFMaster = async (req, res) => {
  try {
    const codeParam = parseInt(req.params.code, 10)
    const bodyCode = parseInt(req.body.Code, 10)
    const Code = Number.isInteger(codeParam) ? codeParam : bodyCode
    const { MasterCat, Category, Activity = '', Weightage, Remarks, Responsibility, check_Status, V_Status } = req.body

    if (!Number.isInteger(Code)) {
      return res.status(400).json({ error: 'Valid Code is required' })
    }
    if (!MasterCat || !Category) {
      return res.status(400).json({ error: 'MasterCat and Category are required' })
    }

    const pool = await getPool()
    const weightValue = normalizeWeight(Weightage)
    const vStatus = normalizeStatus(V_Status)
    const statusValue = check_Status || 'active'
    
    await pool.request()
      .input('Code', sql.Int, Code)
      .input('MasterCat', sql.VarChar(100), MasterCat)
      .input('Category', sql.VarChar(100), Category)
      .input('Activity', sql.VarChar(150), Activity)
      .input('Weightage', sql.Decimal(5, 2), weightValue)
      .input('Remarks', sql.VarChar(255), Remarks || null)
      .input('Responsibility', sql.VarChar(25), Responsibility || null)
      .input('V_Status', sql.VarChar(10), vStatus)
      .input('check_Status', sql.VarChar(10), statusValue)
      .query(`
        UPDATE PMSFMaster 
        SET MasterCat = @MasterCat,
            Category = @Category,
            Activity = @Activity,
            Weightage = @Weightage,
            Remarks = @Remarks,
            Responsibility = @Responsibility,
            V_Status = @V_Status,
            check_Status = @check_Status
        WHERE Code = @Code
      `)
    
    res.json({ message: 'Record updated successfully' })
  } catch (error) {
    console.error('Error updating record:', error)
    res.status(500).json({ error: 'Failed to update record' })
  }
}

// Delete record (mark as deleted)
export const deletePMSFMaster = async (req, res) => {
  try {
    const codeParam = parseInt(req.params.code, 10)
    const bodyCode = parseInt(req.body.Code, 10)
    const Code = Number.isInteger(codeParam) ? codeParam : bodyCode
    if (!Number.isInteger(Code)) {
      return res.status(400).json({ error: 'Valid Code is required' })
    }
    const pool = await getPool()
    
    await pool.request()
      .input('Code', sql.Int, Code)
      .query(`
        UPDATE PMSFMaster 
        SET check_Status = 'deleted'
        WHERE Code = @Code
      `)
    
    res.json({ message: 'Record marked as deleted' })
  } catch (error) {
    console.error('Error deleting record:', error)
    res.status(500).json({ error: 'Failed to delete record' })
  }
}

// Bulk update (for repositioning/reordering)
export const bulkUpdatePMSFMaster = async (req, res) => {
  try {
    console.log('=== BULK UPDATE REQUEST ===');
    console.log('Request body type:', typeof req.body);
    console.log('Is array:', Array.isArray(req.body));
    console.log('Records count:', Array.isArray(req.body) ? req.body.length : 'N/A');
    
    const records = Array.isArray(req.body) ? req.body : req.body.records
    if (!Array.isArray(records)) {
      console.log('ERROR: records is not an array:', records);
      return res.status(400).json({ error: 'records array is required' })
    }
    
    console.log('Processing', records.length, 'records');
    const pool = await getPool()
    
    for (const record of records) {
      const code = parseInt(record.Code, 10)
      if (!Number.isInteger(code)) continue
      const weightValue = normalizeWeight(record.Weightage)
      const vStatus = normalizeStatus(record.V_Status)
      const statusValue = record.check_Status || 'active'
      const indexValue = parseInt(record.Indexing, 10) || 0

      await pool.request()
        .input('Code', sql.Int, code)
        .input('MasterCat', sql.VarChar(100), record.MasterCat)
        .input('Category', sql.VarChar(100), record.Category)
        .input('Activity', sql.VarChar(150), record.Activity || '')
        .input('Weightage', sql.Decimal(5, 2), weightValue)
        .input('Remarks', sql.VarChar(255), record.Remarks || null)
        .input('Responsibility', sql.VarChar(25), record.Responsibility || null)
        .input('V_Status', sql.VarChar(10), vStatus)
        .input('check_Status', sql.VarChar(10), statusValue)
        .input('Indexing', sql.Int, indexValue)
        .query(`
          UPDATE PMSFMaster 
          SET MasterCat = @MasterCat,
              Category = @Category,
              Activity = @Activity,
              Weightage = @Weightage,
              Remarks = @Remarks,
              Responsibility = @Responsibility,
              V_Status = @V_Status,
              check_Status = @check_Status,
              Indexing = @Indexing
          WHERE Code = @Code
        `)
    }
    
    res.json({ message: 'Records updated successfully' })
  } catch (error) {
    console.error('Error bulk updating:', error)
    res.status(500).json({ error: 'Failed to update records' })
  }
}

// Get next available codes
export const getNextAvailableCodes = async (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 1
    const pool = await getPool()
    
    const result = await pool.request().query(`
      SELECT ISNULL(MAX(Code), 0) + 1 as NextCode FROM PMSFMaster
    `)
    
    const nextCode = result.recordset[0].NextCode
    const codes = Array.from({ length: count }, (_, i) => nextCode + i)
    
    res.json({ codes })
  } catch (error) {
    console.error('Error getting next codes:', error)
    res.status(500).json({ error: 'Failed to get next codes' })
  }
}

// Sync endpoint - handles mixed INSERT/UPDATE with re-indexing
export const syncPMSFMaster = async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : req.body.records
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' })
    }
    
    const pool = await getPool()
    
    // Check which Codes already exist in DB
    const allCodes = records.map(r => parseInt(r.Code, 10)).filter(c => Number.isInteger(c))
    const existingCodesResult = await pool.request()
      .query(`SELECT Code FROM PMSFMaster WHERE Code IN (${allCodes.join(',')})`)
    const existingCodes = new Set(existingCodesResult.recordset.map(r => r.Code))
    
    for (const record of records) {
      const code = parseInt(record.Code, 10)
      if (!Number.isInteger(code)) continue
      
      const weightValue = normalizeWeight(record.Weightage)
      const vStatus = normalizeStatus(record.V_Status)
      const statusValue = record.check_Status || 'active'
      const indexValue = parseInt(record.Indexing, 10) || 0
      
      if (existingCodes.has(code)) {
        // UPDATE existing record (preserve CreatedOn/CreatedBy)
        await pool.request()
          .input('Code', sql.Int, code)
          .input('MasterCat', sql.VarChar(100), record.MasterCat)
          .input('Category', sql.VarChar(100), record.Category)
          .input('Activity', sql.VarChar(150), record.Activity || '')
          .input('Weightage', sql.Decimal(5, 2), weightValue)
          .input('Remarks', sql.VarChar(255), record.Remarks || null)
          .input('Responsibility', sql.VarChar(25), record.Responsibility || null)
          .input('V_Status', sql.VarChar(10), vStatus)
          .input('check_Status', sql.VarChar(10), statusValue)
          .input('Indexing', sql.Int, indexValue)
          .query(`
            UPDATE PMSFMaster 
            SET MasterCat = @MasterCat,
                Category = @Category,
                Activity = @Activity,
                Weightage = @Weightage,
                Remarks = @Remarks,
                Responsibility = @Responsibility,
                V_Status = @V_Status,
                check_Status = @check_Status,
                Indexing = @Indexing
            WHERE Code = @Code
          `)
      } else {
        // INSERT new record (Code will be auto-assigned by database)
        await pool.request()
          .input('MasterCat', sql.VarChar(100), record.MasterCat)
          .input('Category', sql.VarChar(100), record.Category)
          .input('Activity', sql.VarChar(150), record.Activity || '')
          .input('Weightage', sql.Decimal(5, 2), weightValue)
          .input('Remarks', sql.VarChar(255), record.Remarks || null)
          .input('Responsibility', sql.VarChar(25), record.Responsibility || null)
          .input('V_Status', sql.VarChar(10), vStatus)
          .input('check_Status', sql.VarChar(10), statusValue)
          .input('Indexing', sql.Int, indexValue)
          .query(`
            INSERT INTO PMSFMaster 
            (MasterCat, Category, Activity, Weightage, Remarks, Responsibility, V_Status, check_Status, Indexing, CreatedOn, CreatedBy)
            VALUES (@MasterCat, @Category, @Activity, @Weightage, @Remarks, @Responsibility, @V_Status, @check_Status, @Indexing, GETDATE(), SYSTEM_USER)
          `)
      }
    }
    
    res.json({ message: 'Records synchronized successfully' })
  } catch (error) {
    console.error('Error syncing records:', error)
    res.status(500).json({ error: 'Failed to sync records', details: error.message })
  }
}
// Get branch details by code
export const getBranchByCode = async (req, res) => {
  try {
    const { code } = req.params
    
    if (!code || code.trim().length < 3) {
      return res.status(400).json({ error: 'Branch code must be at least 3 characters' })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('BranchCode', sql.VarChar, code.trim().toUpperCase())
      .query(`
        SELECT BranchCode, BranchName, Division, RegionName, AreaName
        FROM dbo.Branches
        WHERE BranchCode = @BranchCode
      `)
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Branch not found' })
    }

    const branch = result.recordset[0]
    res.json({
      Code: branch.BranchCode,
      Name: branch.BranchName,
      Division: branch.Division,
      Region: branch.RegionName,
      Area: branch.AreaName
    })
  } catch (error) {
    console.error('Error fetching branch:', error)
    res.status(500).json({ error: 'Failed to fetch branch data', details: error.message })
  }
}
// Helper function to get quarter from date
const getQuarter = (date = new Date()) => {
  const month = date.getMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

// Check if visit exists for branch and current quarter, and get PMSF data
export const checkVisitAndGetPMSF = async (req, res) => {
  try {
    const { branchCode } = req.params;
    const { visitDate, visitMonth, visitQuarter, visitYear } = req.query;
    
    if (!branchCode || branchCode.trim().length === 0) {
      return res.status(400).json({ error: 'Branch code is required' });
    }

    if (!visitDate || !visitMonth || !visitQuarter || !visitYear) {
      return res.status(400).json({ error: 'Visit date details (month, quarter, year) are required' });
    }

    const pool = await getPool();
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const dayOfMonth = today.getDate();

    const queryMonth = parseInt(visitMonth);
    const queryQuarter = parseInt(visitQuarter);
    const queryYear = parseInt(visitYear);

    // Check for existing visits with SAME QUARTER AND YEAR
    const visitCheck = await pool.request()
      .input('BranchCode', sql.Char(3), branchCode.trim().toUpperCase())
      .input('Quarter', sql.Int, queryQuarter)
      .input('Year', sql.Int, queryYear)
      .query(`
        SELECT TOP 1 visitcode, VisitDateTime, BranchName, Quarter, Month, Year
        FROM dbo.Visits
        WHERE BranchCode = @BranchCode AND Quarter = @Quarter AND Year = @Year
        ORDER BY VisitDateTime DESC
      `);

    let canEdit = false;
    let existingVisitcode = null;
    let visitAllowed = true;
    let visitMessage = '';

    if (visitCheck.recordset.length > 0) {
      // Entry exists for this quarter and year
      const existingVisit = visitCheck.recordset[0];
      const existingMonth = existingVisit.Month;
      const existingYear = existingVisit.Year;
      const visitDateTime = new Date(existingVisit.VisitDateTime);
      existingVisitcode = existingVisit.visitcode;

      // Compare month and year together to avoid issues with different years
      const isExistingMonthPast = existingYear < currentYear || 
                                  (existingYear === currentYear && existingMonth < currentMonth);
      const isExistingMonthCurrent = existingYear === currentYear && existingMonth === currentMonth;
      const isExistingMonthFuture = existingYear > currentYear || 
                                    (existingYear === currentYear && existingMonth > currentMonth);

      // If visit is from a PAST MONTH (not current month)
      if (isExistingMonthPast) {
        // Only allow edit if today is before or on 7th of current month (and we're in the same year)
        if (existingYear === currentYear && dayOfMonth <= 7) {
          canEdit = true;
          visitMessage = 'Entry already done for this quarter (previous month). Edit allowed until 7th of current month.';
        } else {
          canEdit = false;
          visitAllowed = false;
          visitMessage = 'Entry already done for this quarter (previous month). Edit period expired (allowed only until 7th).';
        }
      } else if (isExistingMonthCurrent) {
        // Visit is from current month - always editable
        canEdit = true;
        visitMessage = 'Entry already done for this quarter (current month). Edit allowed.';
      } else if (isExistingMonthFuture) {
        // Visit is from future month - allow edit
        canEdit = true;
        visitMessage = 'Entry already done for this quarter. Edit allowed.';
      }

      // Return existing visit info and edit permission
      return res.json({
        success: true,
        existingVisit: {
          visitcode: existingVisitcode,
          visitDateTime: visitDateTime.toLocaleString(),
          branchName: existingVisit.BranchName,
          quarter: existingVisit.Quarter,
          month: existingVisit.Month,
          year: existingVisit.Year
        },
        canEdit: canEdit,
        visitAllowed: visitAllowed,
        message: visitMessage,
        pmsfData: []
      });
    }

    // No existing visit for this quarter and year - new entry allowed
    const pmsfData = await pool.request().query(`
      SELECT Code, MasterCat, Category, Activity, Remarks, 
             Weightage, V_Status, Responsibility, check_Status,
             CreatedOn, CreatedBy, Indexing 
      FROM PMSFMaster
      WHERE check_Status = 'active'
      ORDER BY Indexing
    `);

    res.json({
      success: true,
      pmsfData: pmsfData.recordset,
      existingVisit: null,
      canEdit: false,
      visitAllowed: true,
      message: 'No existing entry for this quarter. New entry allowed.'
    });

  } catch (error) {
    console.error('Error checking visit and getting PMSF:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message 
    });
  }
}

// Submit PMSF Form
export const submitPMSFForm = async (req, res) => {
  try {
    const { formInfo, activities } = req.body;

    // Validate required fields
    if (!formInfo || !activities || !Array.isArray(activities)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request data' 
      });
    }

    const { branchCode, branchName, visitDate, approvedBy, division, region, area, visitOfficerName } = formInfo;

    if (!branchCode || !approvedBy) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch code and approved by are required' 
      });
    }

    // Validate each activity
    const validationErrors = [];
    activities.forEach((activity, index) => {
      if (activity.vStatus === 'No') {
        if (!activity.responsibility || activity.responsibility.trim() === '') {
          validationErrors.push(`${activity.category} - ${activity.activity}: Responsibility is required when Status is "No"`);
        }
        if (!activity.remarks || activity.remarks.trim() === '') {
          validationErrors.push(`${activity.category} - ${activity.activity}: Remarks is required when Status is "No"`);
        }
      } else if (activity.vStatus === 'Yes') {
        if (activity.responsibility && activity.responsibility.trim() !== '') {
          validationErrors.push(`${activity.category} - ${activity.activity}: Responsibility must be empty when Status is "Yes"`);
        }
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const pool = await getPool();

    const visitDateTime = visitDate ? new Date(visitDate) : new Date();
    const visitMonth = visitDateTime.getMonth() + 1;
    const visitQuarter = Math.ceil(visitMonth / 3);
    const visitYear = visitDateTime.getFullYear();

    const visitDateStart = new Date(visitDateTime);
    visitDateStart.setHours(0, 0, 0, 0);
    const visitDateEnd = new Date(visitDateStart);
    visitDateEnd.setDate(visitDateEnd.getDate() + 1);

    let branchNameValue = branchName ? String(branchName).trim() : '';
    let divisionValue = division ? String(division).trim() : '';
    let regionValue = region ? String(region).trim() : null;
    let areaValue = area ? String(area).trim() : null;

    if (!branchNameValue || !divisionValue) {
      const branchResult = await pool.request()
        .input('BranchCode', sql.VarChar, branchCode.trim().toUpperCase())
        .query(`
          SELECT BranchCode, BranchName, Division, RegionName, AreaName
          FROM dbo.Branches
          WHERE BranchCode = @BranchCode
        `);

      if (branchResult.recordset.length > 0) {
        const branch = branchResult.recordset[0];
        branchNameValue = branchNameValue || branch.BranchName;
        divisionValue = divisionValue || branch.Division;
        regionValue = regionValue || branch.RegionName || null;
        areaValue = areaValue || branch.AreaName || null;
      }
    }

    if (!branchNameValue || !divisionValue) {
      return res.status(400).json({
        success: false,
        message: 'Branch name and division are required for Visits summary'
      });
    }

    const existingVisitResult = await pool.request()
      .input('BranchCode', sql.Char(3), branchCode.trim().toUpperCase())
      .input('VisitDateStart', sql.DateTime2, visitDateStart)
      .input('VisitDateEnd', sql.DateTime2, visitDateEnd)
      .query(`
        SELECT TOP 1 visitcode
        FROM dbo.Visits
        WHERE BranchCode = @BranchCode
          AND VisitDateTime >= @VisitDateStart
          AND VisitDateTime < @VisitDateEnd
        ORDER BY visitcode DESC
      `);

    if (existingVisitResult.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A visit for this branch and date already exists. Please use edit instead of submitting again.'
      });
    }

    const visitByValue = visitOfficerName && String(visitOfficerName).trim()
      ? String(visitOfficerName).trim()
      : approvedBy.trim();
    const createdByValue = visitByValue;
    const scoreTotals = activities.reduce(
      (totals, activity) => {
        const weightValue = normalizeWeight(activity.weightage);
        if (activity.vStatus !== 'NA') {
          totals.nonNa += weightValue;
        }
        if (activity.vStatus === 'Yes') {
          totals.yes += weightValue;
        }
        return totals;
      },
      { yes: 0, nonNa: 0 }
    );
    const totalScore = scoreTotals.nonNa > 0
      ? (scoreTotals.yes / scoreTotals.nonNa) * 100
      : 0;

    // Insert visit summary into dbo.Visits
    const visitInsertResult = await pool.request()
      .input('BranchCode', sql.Char(3), branchCode.trim().toUpperCase())
      .input('BranchName', sql.VarChar(100), branchNameValue)
      .input('Division', sql.VarChar(20), divisionValue)
      .input('Region', sql.VarChar(100), regionValue)
      .input('Area', sql.VarChar(100), areaValue)
      .input('Month', sql.TinyInt, visitMonth)
      .input('Quarter', sql.TinyInt, visitQuarter)
      .input('Year', sql.SmallInt, visitYear)
      .input('VisitDateTime', sql.DateTime2, visitDateTime)
      .input('VisitBy', sql.NVarChar(128), visitByValue)
      .input('ApprovedBy_OM_BM', sql.NVarChar(128), approvedBy.trim())
      .input('CreatedOn', sql.DateTime2, new Date())
      .input('CreatedBy', sql.NVarChar(128), createdByValue)
      .input('Score', sql.Decimal(10, 2), totalScore)
      .query(`
        INSERT INTO dbo.Visits
        (BranchCode, BranchName, Division, Region, Area, Month, Quarter, Year, VisitDateTime, VisitBy, ApprovedBy_OM_BM, CreatedOn, CreatedBy, Score)
        VALUES
        (@BranchCode, @BranchName, @Division, @Region, @Area, @Month, @Quarter, @Year, @VisitDateTime, @VisitBy, @ApprovedBy_OM_BM, @CreatedOn, @CreatedBy, @Score)
      `);

    // Get the generated visitcode from the Visits table (it's an identity)
    const visitsResult = await pool.request()
      .input('BranchCode', sql.Char(3), branchCode.trim().toUpperCase())
      .input('VisitDateTime', sql.DateTime2, visitDateTime)
      .query(`
        SELECT TOP 1 visitcode FROM dbo.Visits 
        WHERE BranchCode = @BranchCode AND VisitDateTime = @VisitDateTime 
        ORDER BY visitcode DESC
      `);
    
    const visitcode = visitsResult.recordset[0]?.visitcode || 1;

    // Insert each activity into PMSFdata
    let insertedCount = 0;
    for (const activity of activities) {
      // Use activity.vStatus from frontend (user selection or default from master)
      const vStatusValue = activity.vStatus || 'NA';
      
      // Calculate Result: Weightage if Yes, 0 if No or NA
      const result = vStatusValue === 'Yes' ? activity.weightage : 0;

      // Extract media file names
      const imglink1 = activity.imglink1 || null;
      const imglink2 = activity.imglink2 || null;
      const imglink3 = activity.imglink3 || null;
      const videolink = activity.videolink || null;

      const insertResult = await pool.request()
        .input('visitcode', sql.Int, visitcode)
        .input('code', sql.Int, activity.code)
        .input('masterCat', sql.VarChar, activity.masterCat)
        .input('category', sql.VarChar, activity.category)
        .input('activity', sql.VarChar, activity.activity)
        .input('remarks', sql.VarChar, activity.remarks || null)
        .input('weightage', sql.Decimal(10, 2), activity.weightage)
        .input('vStatus', sql.VarChar, vStatusValue)
        .input('responsibility', sql.VarChar, activity.responsibility || null)
        .input('indexing', sql.Int, activity.indexing)
        .input('result', sql.Decimal(10, 2), result)
        .input('imglink1', sql.VarChar, imglink1)
        .input('imglink2', sql.VarChar, imglink2)
        .input('imglink3', sql.VarChar, imglink3)
        .input('videolink', sql.VarChar, videolink)
        .input('createdOn', sql.DateTime2, new Date())
        .input('createdBy', sql.NVarChar, visitByValue)
        .query(`
          INSERT INTO PMSFdata 
          (visitcode, Code, MasterCat, Category, Activity, Remarks, Weightage, V_Status, Responsibility, Indexing, Result, imglink1, imglink2, imglink3, videolink, CreatedOn, CreatedBy)
          VALUES 
          (@visitcode, @code, @masterCat, @category, @activity, @remarks, @weightage, @vStatus, @responsibility, @indexing, @result, @imglink1, @imglink2, @imglink3, @videolink, @createdOn, @createdBy)
        `);

      if (insertResult.rowsAffected[0] === 1) {
        insertedCount++;
      }
    }

    console.log('=== PMSF FORM SUBMISSION ===');
    console.log('Visit Code:', visitcode);
    console.log('Branch Code:', branchCode);
    console.log('Approved By:', approvedBy);
    console.log('Activities Inserted:', insertedCount, '/', activities.length);

    if (insertedCount === activities.length) {
      res.json({ 
        success: true, 
        message: 'Form submitted successfully',
        visitcode: visitcode,
        recordsInserted: insertedCount
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Only ${insertedCount} out of ${activities.length} activities were saved`
      });
    }

  } catch (error) {
    console.error('Error submitting PMSF form:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit form', 
      details: error.message 
    });
  }
}

// Upload media files (images/videos)
export const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    // Return file paths relative to the Images folder
    const filePaths = req.files.map(file => file.filename);

    res.json({ 
      success: true, 
      files: filePaths,
      message: `Successfully uploaded ${filePaths.length} file(s)`
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload files', 
      details: error.message 
    });
  }
}

// Get existing PMSF data for editing
export const getExistingPMSFData = async (req, res) => {
  try {
    const { visitcode } = req.params;

    if (!visitcode || isNaN(visitcode)) {
      return res.status(400).json({ error: 'Valid visitcode is required' });
    }

    const pool = await getPool();

    // Get visit summary
    const visitResult = await pool.request()
      .input('visitcode', sql.Int, parseInt(visitcode))
      .query(`
        SELECT visitcode, BranchCode, BranchName, Division, Region, Area, 
               VisitDateTime, VisitBy, ApprovedBy_OM_BM, Score
        FROM dbo.Visits
        WHERE visitcode = @visitcode
      `);

    if (visitResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    // Get all activity data for this visit
    const pmsfResult = await pool.request()
      .input('visitcode', sql.Int, parseInt(visitcode))
      .query(`
        SELECT Code, MasterCat, Category, Activity, Remarks, 
               Weightage, V_Status, Responsibility, Indexing, Result,
               imglink1, imglink2, imglink3, videolink
        FROM PMSFdata
        WHERE visitcode = @visitcode
        ORDER BY Indexing
      `);

    res.json({
      success: true,
      visit: visitResult.recordset[0],
      activities: pmsfResult.recordset
    });

  } catch (error) {
    console.error('Error fetching existing PMSF data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch existing data', 
      details: error.message 
    });
  }
}
// Update existing PMSF form submission
export const updatePMSFFormSubmission = async (req, res) => {
  try {
    const { visitcode, activities } = req.body;

    if (!visitcode || !activities || !Array.isArray(activities)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request data' 
      });
    }

    const pool = await getPool();

    // Update each activity in PMSFdata
    let updatedCount = 0;
    for (const activity of activities) {
      // Calculate Result: Weightage if Yes, 0 if No or NA
      const vStatusValue = activity.vStatus || 'NA';
      const result = vStatusValue === 'Yes' ? activity.weightage : 0;

      // Extract media file names
      const imglink1 = activity.imglink1 || null;
      const imglink2 = activity.imglink2 || null;
      const imglink3 = activity.imglink3 || null;
      const videolink = activity.videolink || null;

      await pool.request()
        .input('visitcode', sql.Int, visitcode)
        .input('code', sql.Int, activity.code)
        .input('remarks', sql.VarChar, activity.remarks || null)
        .input('vStatus', sql.VarChar, vStatusValue)
        .input('responsibility', sql.VarChar, activity.responsibility || null)
        .input('result', sql.Decimal(10, 2), result)
        .input('imglink1', sql.VarChar, imglink1)
        .input('imglink2', sql.VarChar, imglink2)
        .input('imglink3', sql.VarChar, imglink3)
        .input('videolink', sql.VarChar, videolink)
        .query(`
          UPDATE PMSFdata 
          SET Remarks = @remarks, V_Status = @vStatus, Responsibility = @responsibility, 
              Result = @result, imglink1 = @imglink1, imglink2 = @imglink2, 
              imglink3 = @imglink3, videolink = @videolink
          WHERE visitcode = @visitcode AND Code = @code
        `);

      updatedCount++;
    }

    console.log('=== PMSF FORM UPDATE ===');
    console.log('Visit Code:', visitcode);
    console.log('Activities Updated:', updatedCount, '/', activities.length);

    if (updatedCount === activities.length) {
      res.json({ 
        success: true, 
        message: 'Form updated successfully',
        visitcode: visitcode,
        recordsUpdated: updatedCount
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Only ${updatedCount} out of ${activities.length} activities were updated`
      });
    }

  } catch (error) {
    console.error('Error updating PMSF form:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update form', 
      details: error.message 
    });
  }
}

// Get visit data by branch code, year, and quarter
export const getVisitData = async (req, res) => {
  try {
    const { branchCode, year, qtr } = req.params;

    if (!branchCode || !year || !qtr) {
      return res.status(400).json({ 
        success: false,
        message: 'Branch code, year, and quarter are required' 
      });
    }

    const pool = await getPool();
    
    // Get visit summary from dbo.Visits
    const visitResult = await pool.request()
      .input('BranchCode', sql.Char(3), branchCode.trim().toUpperCase())
      .input('Year', sql.Int, parseInt(year))
      .input('Quarter', sql.Int, parseInt(qtr))
      .query(`
        SELECT visitcode, BranchCode, BranchName, Division, Region, Area, 
               VisitDateTime, VisitBy, ApprovedBy_OM_BM, Score, Month, Quarter, Year
        FROM dbo.Visits
        WHERE BranchCode = @BranchCode AND Year = @Year AND Quarter = @Quarter
        ORDER BY VisitDateTime DESC
      `);

    if (visitResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: `No visit found for branch ${branchCode} in Q${qtr} of ${year}`
      });
    }

    const visit = visitResult.recordset[0];
    const visitcode = visit.visitcode;

    // Get all activity data for this visit
    const pmsfResult = await pool.request()
      .input('visitcode', sql.Int, visitcode)
      .query(`
        SELECT Code, MasterCat, Category, Activity, Remarks, 
               Weightage, V_Status, Responsibility, Indexing, Result,
               imglink1, imglink2, imglink3, videolink
        FROM PMSFdata
        WHERE visitcode = @visitcode
        ORDER BY Indexing
      `);

    res.json({
      success: true,
      message: 'Visit data found',
      visit: visit,
      activities: pmsfResult.recordset
    });

  } catch (error) {
    console.error('Error fetching visit data:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch visit data', 
      details: error.message 
    });
  }
}

export const getPreviousQuarterEntry = async (req, res) => {
  try {
    const { branchCode, year, quarter } = req.params;

    if (!branchCode || !year || !quarter) {
      return res.status(400).json({ 
        success: false, 
        message: 'branchCode, year, and quarter are required' 
      });
    }

    const pool = await getPool();
    const quarterNum = parseInt(quarter, 10);
    
    // Calculate previous quarter
    let prevYear = parseInt(year, 10);
    let prevQuarter = quarterNum - 1;
    
    if (prevQuarter < 1) {
      prevQuarter = 4;
      prevYear -= 1;
    }

    console.log(`Fetching previous quarter entry: Branch=${branchCode}, Current Q${quarterNum} ${year}, Previous Q${prevQuarter} ${prevYear}`);

    // Query for previous quarter visit
    const visitResult = await pool.request()
      .input('BranchCode', sql.VarChar(10), branchCode)
      .input('Year', sql.Int, prevYear)
      .input('Quarter', sql.Int, prevQuarter)
      .query(`
        SELECT TOP 1 visitcode, BranchCode, BranchName, VisitDateTime, VisitBy, Score, Month, Quarter, Year
        FROM dbo.Visits
        WHERE BranchCode = @BranchCode 
          AND Year = @Year 
          AND Quarter = @Quarter
        ORDER BY VisitDateTime DESC
      `);

    if (visitResult.recordset.length === 0) {
      return res.json({ 
        success: true, 
        previousEntry: null,
        message: 'No previous quarter entry found'
      });
    }

    const visit = visitResult.recordset[0];

    // Fetch activities for this visit
    const activitiesResult = await pool.request()
      .input('visitcode', sql.Int, visit.visitcode)
      .query(`
        SELECT Code, MasterCat, Category, Activity, V_Status, Responsibility, 
               Remarks, Weightage, imglink1, imglink2, imglink3, videolink, Indexing
        FROM dbo.PMSFdata
        WHERE visitcode = @visitcode
        ORDER BY Indexing
      `);

    res.json({
      success: true,
      previousEntry: {
        visitcode: visit.visitcode,
        visitDate: visit.VisitDateTime,
        visitedBy: visit.VisitBy,
        score: visit.Score,
        activities: activitiesResult.recordset
      }
    });

  } catch (error) {
    console.error('Error fetching previous quarter entry:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch previous quarter entry', 
      details: error.message 
    });
  }
}