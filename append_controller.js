
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
    
    if (!branchCode || branchCode.trim().length === 0) {
      return res.status(400).json({ error: 'Branch code is required' });
    }

    const pool = await getPool();
    const quarter = getQuarter();

    // Check if visit already exists for this branch and quarter
    const visitCheck = await pool.request()
      .input('BranchCode', sql.VarChar, branchCode.trim().toUpperCase())
      .input('Quarter', sql.VarChar, quarter)
      .query(`
        SELECT TOP 1 VisitID, VisitDate, BranchName, BranchCode
        FROM dbo.Visits
        WHERE BranchCode = @BranchCode AND Quarter = @Quarter
        ORDER BY VisitDate DESC
      `);

    if (visitCheck.recordset.length > 0) {
      const existingVisit = visitCheck.recordset[0];
      const visitDateTime = new Date(existingVisit.VisitDate).toLocaleString();
      return res.status(409).json({
        error: 'Visit already exists',
        message: `Entry for branch ${existingVisit.BranchCode} (${existingVisit.BranchName}) is already done on ${visitDateTime}`,
        visitDate: existingVisit.VisitDate,
        branchName: existingVisit.BranchName
      });
    }

    // Get PMSF data for populating the form
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
      quarter,
      pmsfData: pmsfData.recordset,
      message: 'No existing visit found. Ready to generate form.'
    });

  } catch (error) {
    console.error('Error checking visit and getting PMSF:', error);
    res.status(500).json({ 
      error: 'Failed to process request', 
      details: error.message 
    });
  }
}
