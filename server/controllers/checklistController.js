import sql from 'mssql';
import { getPool } from '../config/database.js';

let tablesEnsured = false;

const safeJson = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      const split = value.split(',').map((item) => item.trim()).filter(Boolean);
      return split.length ? split : fallback;
    }
  }
  return fallback;
};

const cleanArray = (value) => safeJson(value, []).map((item) => String(item).trim()).filter(Boolean);

const ensureChecklistTables = async () => {
  if (tablesEnsured) return;

  const pool = await getPool();
  await pool.request().query(`
    IF OBJECT_ID('dbo.CustomChecklistTemplates', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.CustomChecklistTemplates (
        TemplateID INT IDENTITY(1,1) PRIMARY KEY,
        ChecklistName NVARCHAR(200) NOT NULL,
        Department NVARCHAR(120) NOT NULL,
        ChecklistScope NVARCHAR(20) NOT NULL DEFAULT 'branch',
        CategoryHeader NVARCHAR(120) NOT NULL DEFAULT 'Category',
        SubCategoryHeader NVARCHAR(120) NOT NULL DEFAULT 'Sub Category',
        DescriptionHeaders NVARCHAR(MAX) NULL,
        StatusMode NVARCHAR(20) NOT NULL DEFAULT 'global',
        IncludeWeightedScore BIT NOT NULL DEFAULT 0,
        GlobalStatuses NVARCHAR(MAX) NULL,
        StatusScoreRules NVARCHAR(MAX) NULL,
        IncludeResponsibilities BIT NOT NULL DEFAULT 0,
        Responsibilities NVARCHAR(MAX) NULL,
        IncludeReviewedBy BIT NOT NULL DEFAULT 0,
        AllowImage BIT NOT NULL DEFAULT 0,
        AllowVideo BIT NOT NULL DEFAULT 0,
        AllowAttachment BIT NOT NULL DEFAULT 0,
        IncludeTimeline BIT NOT NULL DEFAULT 0,
        IncludeApprovedBy BIT NOT NULL DEFAULT 0,
        ReviewedBy NVARCHAR(120) NULL,
        ApprovedBy NVARCHAR(120) NULL,
        CreatedBy NVARCHAR(120) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    END;

    IF OBJECT_ID('dbo.CustomChecklistTemplateItems', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.CustomChecklistTemplateItems (
        ItemID INT IDENTITY(1,1) PRIMARY KEY,
        TemplateID INT NOT NULL,
        Category NVARCHAR(150) NOT NULL,
        SubCategory NVARCHAR(150) NULL,
        DescriptionValues NVARCHAR(MAX) NULL,
        StatusOptions NVARCHAR(MAX) NULL,
        WeightScore DECIMAL(10,2) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CustomChecklistTemplateItems_TemplateID FOREIGN KEY (TemplateID)
          REFERENCES dbo.CustomChecklistTemplates(TemplateID)
          ON DELETE CASCADE
      );
    END;

    IF OBJECT_ID('dbo.CustomChecklistEntries', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.CustomChecklistEntries (
        EntryID INT IDENTITY(1,1) PRIMARY KEY,
        TemplateID INT NOT NULL,
        BranchCode NVARCHAR(50) NULL,
        Department NVARCHAR(120) NULL,
        ReviewDate DATETIME2 NULL,
        ReviewedBy NVARCHAR(120) NULL,
        ApprovedBy NVARCHAR(120) NULL,
        FilledBy NVARCHAR(120) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_CustomChecklistEntries_TemplateID FOREIGN KEY (TemplateID)
          REFERENCES dbo.CustomChecklistTemplates(TemplateID)
      );
    END;

    IF OBJECT_ID('dbo.CustomChecklistEntryItems', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.CustomChecklistEntryItems (
        EntryItemID INT IDENTITY(1,1) PRIMARY KEY,
        EntryID INT NOT NULL,
        ItemID INT NOT NULL,
        SelectedStatus NVARCHAR(120) NULL,
        ScoreAwarded DECIMAL(10,2) NULL,
        Remarks NVARCHAR(MAX) NULL,
        Responsibilities NVARCHAR(MAX) NULL,
        Timeline NVARCHAR(50) NULL,
        ImageUrl NVARCHAR(500) NULL,
        ImageUrls NVARCHAR(MAX) NULL,
        VideoUrl NVARCHAR(500) NULL,
        VideoUrls NVARCHAR(MAX) NULL,
        AttachmentUrl NVARCHAR(500) NULL,
        CONSTRAINT FK_CustomChecklistEntryItems_EntryID FOREIGN KEY (EntryID)
          REFERENCES dbo.CustomChecklistEntries(EntryID)
          ON DELETE CASCADE,
        CONSTRAINT FK_CustomChecklistEntryItems_ItemID FOREIGN KEY (ItemID)
          REFERENCES dbo.CustomChecklistTemplateItems(ItemID)
      );
    END;
  `);

  // Add new columns to existing tables if they don't exist yet (safe migration)
  await pool.request().query(`
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'CategoryHeader') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD CategoryHeader NVARCHAR(120) NOT NULL DEFAULT 'Category';
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'SubCategoryHeader') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD SubCategoryHeader NVARCHAR(120) NOT NULL DEFAULT 'Sub Category';
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'DescriptionHeaders') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD DescriptionHeaders NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'IncludeWeightedScore') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD IncludeWeightedScore BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'AllowAttachment') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD AllowAttachment BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'StatusScoreRules') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD StatusScoreRules NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'IncludeResponsibilities') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD IncludeResponsibilities BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'IncludeReviewedBy') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD IncludeReviewedBy BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'IncludeApprovedBy') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD IncludeApprovedBy BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('dbo.CustomChecklistTemplates', 'IncludeTimeline') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplates ADD IncludeTimeline BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('dbo.CustomChecklistEntryItems', 'AttachmentUrl') IS NULL
      ALTER TABLE dbo.CustomChecklistEntryItems ADD AttachmentUrl NVARCHAR(500) NULL;
    IF COL_LENGTH('dbo.CustomChecklistEntryItems', 'Timeline') IS NULL
      ALTER TABLE dbo.CustomChecklistEntryItems ADD Timeline NVARCHAR(50) NULL;
    IF COL_LENGTH('dbo.CustomChecklistEntryItems', 'ImageUrls') IS NULL
      ALTER TABLE dbo.CustomChecklistEntryItems ADD ImageUrls NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.CustomChecklistEntryItems', 'VideoUrls') IS NULL
      ALTER TABLE dbo.CustomChecklistEntryItems ADD VideoUrls NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.CustomChecklistTemplateItems', 'WeightScore') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplateItems ADD WeightScore DECIMAL(10,2) NULL;
    IF COL_LENGTH('dbo.CustomChecklistTemplateItems', 'DescriptionValues') IS NULL
      ALTER TABLE dbo.CustomChecklistTemplateItems ADD DescriptionValues NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.CustomChecklistEntryItems', 'ScoreAwarded') IS NULL
      ALTER TABLE dbo.CustomChecklistEntryItems ADD ScoreAwarded DECIMAL(10,2) NULL;
    IF COL_LENGTH('dbo.CustomChecklistEntries', 'ReviewDate') IS NULL
      ALTER TABLE dbo.CustomChecklistEntries ADD ReviewDate DATETIME2 NULL;
  `);

  tablesEnsured = true;
};

const mapTemplate = (row) => ({
  id: row.TemplateID,
  checklistName: row.ChecklistName,
  department: row.Department,
  checklistScope: row.ChecklistScope,
  categoryHeader: row.CategoryHeader || 'Category',
  subCategoryHeader: row.SubCategoryHeader || 'Sub Category',
  descriptionHeaders: safeJson(row.DescriptionHeaders, []),
  statusMode: row.StatusMode,
  includeWeightedScore: !!row.IncludeWeightedScore,
  globalStatuses: safeJson(row.GlobalStatuses, ['Yes', 'No', 'NA']),
  statusScoreRules: safeJson(row.StatusScoreRules, []),
  responsibilities: safeJson(row.Responsibilities, []),
  includeResponsibilities: !!row.IncludeResponsibilities,
  allowImage: !!row.AllowImage,
  allowVideo: !!row.AllowVideo,
  allowAttachment: !!row.AllowAttachment,
  includeTimeline: !!row.IncludeTimeline,
  includeReviewedBy: !!row.IncludeReviewedBy,
  reviewedBy: row.ReviewedBy || '',
  includeApprovedBy: !!row.IncludeApprovedBy,
  approvedBy: row.ApprovedBy || '',
  createdBy: row.CreatedBy || '',
  createdAt: row.CreatedAt,
  updatedAt: row.UpdatedAt,
  isActive: !!row.IsActive
});

export const getChecklistTemplates = async (req, res) => {
  try {
    await ensureChecklistTables();
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT t.*, COUNT(i.ItemID) AS ItemCount
      FROM dbo.CustomChecklistTemplates t
      LEFT JOIN dbo.CustomChecklistTemplateItems i ON i.TemplateID = t.TemplateID
      WHERE t.IsActive = 1
      GROUP BY
        t.TemplateID, t.ChecklistName, t.Department, t.ChecklistScope,
        t.CategoryHeader, t.SubCategoryHeader, t.DescriptionHeaders, t.StatusMode, t.IncludeWeightedScore,
        t.GlobalStatuses, t.StatusScoreRules, t.IncludeResponsibilities, t.Responsibilities,
        t.IncludeReviewedBy, t.AllowImage, t.AllowVideo, t.AllowAttachment,
        t.IncludeTimeline, t.IncludeApprovedBy,
        t.ReviewedBy, t.ApprovedBy, t.CreatedBy, t.IsActive, t.CreatedAt, t.UpdatedAt
      ORDER BY t.CreatedAt DESC
    `);

    const templates = result.recordset.map((row) => ({
      ...mapTemplate(row),
      itemCount: Number(row.ItemCount || 0)
    }));

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching checklist templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch checklist templates' });
  }
};

export const getChecklistTemplateById = async (req, res) => {
  try {
    await ensureChecklistTables();
    const templateId = Number(req.params.templateId);

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return res.status(400).json({ success: false, error: 'Valid templateId is required' });
    }

    const pool = await getPool();

    const templateResult = await pool.request()
      .input('TemplateID', sql.Int, templateId)
      .query(`
        SELECT *
        FROM dbo.CustomChecklistTemplates
        WHERE TemplateID = @TemplateID AND IsActive = 1
      `);

    if (!templateResult.recordset.length) {
      return res.status(404).json({ success: false, error: 'Checklist template not found' });
    }

    const itemResult = await pool.request()
      .input('TemplateID', sql.Int, templateId)
      .query(`
        SELECT ItemID, Category, SubCategory, DescriptionValues, StatusOptions, WeightScore, SortOrder
        FROM dbo.CustomChecklistTemplateItems
        WHERE TemplateID = @TemplateID
        ORDER BY SortOrder ASC, ItemID ASC
      `);

    const template = mapTemplate(templateResult.recordset[0]);
    const items = itemResult.recordset.map((item) => ({
      itemId: item.ItemID,
      category: item.Category,
      subCategory: item.SubCategory || '',
      descriptionValues: safeJson(item.DescriptionValues, []),
      statusOptions: safeJson(item.StatusOptions, []),
      weightScore: item.WeightScore !== null && item.WeightScore !== undefined ? Number(item.WeightScore) : null,
      sortOrder: item.SortOrder
    }));

    res.json({ success: true, template: { ...template, items } });
  } catch (error) {
    console.error('Error fetching checklist template by id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch checklist template' });
  }
};

export const createChecklistTemplate = async (req, res) => {
  const transaction = new sql.Transaction(await getPool());

  try {
    await ensureChecklistTables();

    const {
      checklistName,
      department,
      checklistScope,
      categoryHeader,
      subCategoryHeader,
      descriptionHeaders,
      statusMode,
      includeWeightedScore,
      globalStatuses,
      statusScoreRules,
      includeResponsibilities,
      responsibilities,
      includeReviewedBy,
      reviewedBy,
      includeApprovedBy,
      approvedBy,
      includeTimeline,
      allowImage,
      allowVideo,
      allowAttachment,
      items
    } = req.body;

    const normalizedItems = Array.isArray(items) ? items : [];

    if (!checklistName || !department || !normalizedItems.length) {
      return res.status(400).json({
        success: false,
        error: 'Checklist name, department, and at least one checklist item are required'
      });
    }

    await transaction.begin();

    const templateRequest = new sql.Request(transaction);
    const createdBy = req.user?.username || req.user?.email || req.user?.userId?.toString() || 'system';

    const templateInsertResult = await templateRequest
      .input('ChecklistName', sql.NVarChar(200), checklistName.trim())
      .input('Department', sql.NVarChar(120), department.trim())
      .input('ChecklistScope', sql.NVarChar(20), checklistScope === 'department' ? 'department' : 'branch')
      .input('CategoryHeader', sql.NVarChar(120), categoryHeader?.trim() || 'Category')
      .input('SubCategoryHeader', sql.NVarChar(120), subCategoryHeader?.trim() || 'Sub Category')
      .input('DescriptionHeaders', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(descriptionHeaders)))
      .input('StatusMode', sql.NVarChar(20), statusMode === 'segment' ? 'segment' : 'global')
      .input('IncludeWeightedScore', sql.Bit, includeWeightedScore ? 1 : 0)
      .input('GlobalStatuses', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(globalStatuses)))
      .input('StatusScoreRules', sql.NVarChar(sql.MAX), JSON.stringify(Array.isArray(statusScoreRules) ? statusScoreRules : []))
      .input('IncludeResponsibilities', sql.Bit, includeResponsibilities ? 1 : 0)
      .input('Responsibilities', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(responsibilities)))
      .input('IncludeReviewedBy', sql.Bit, includeReviewedBy ? 1 : 0)
      .input('ReviewedBy', sql.NVarChar(120), reviewedBy?.trim() || null)
      .input('IncludeApprovedBy', sql.Bit, includeApprovedBy ? 1 : 0)
      .input('ApprovedBy', sql.NVarChar(120), approvedBy?.trim() || null)
      .input('IncludeTimeline', sql.Bit, includeTimeline ? 1 : 0)
      .input('AllowImage', sql.Bit, allowImage ? 1 : 0)
      .input('AllowVideo', sql.Bit, allowVideo ? 1 : 0)
      .input('AllowAttachment', sql.Bit, allowAttachment ? 1 : 0)
      .input('CreatedBy', sql.NVarChar(120), createdBy)
      .query(`
        INSERT INTO dbo.CustomChecklistTemplates
          (ChecklistName, Department, ChecklistScope, CategoryHeader, SubCategoryHeader, DescriptionHeaders,
           StatusMode, IncludeWeightedScore, GlobalStatuses, StatusScoreRules,
           IncludeResponsibilities, Responsibilities, IncludeReviewedBy, ReviewedBy,
           IncludeApprovedBy, ApprovedBy, IncludeTimeline, AllowImage, AllowVideo, AllowAttachment, CreatedBy)
        VALUES
          (@ChecklistName, @Department, @ChecklistScope, @CategoryHeader, @SubCategoryHeader, @DescriptionHeaders,
           @StatusMode, @IncludeWeightedScore, @GlobalStatuses, @StatusScoreRules,
           @IncludeResponsibilities, @Responsibilities, @IncludeReviewedBy, @ReviewedBy,
           @IncludeApprovedBy, @ApprovedBy, @IncludeTimeline, @AllowImage, @AllowVideo, @AllowAttachment, @CreatedBy);

        SELECT CAST(SCOPE_IDENTITY() AS INT) AS TemplateID;
      `);

    const templateId = templateInsertResult.recordset[0].TemplateID;

    for (let index = 0; index < normalizedItems.length; index += 1) {
      const item = normalizedItems[index];
      const category = item.category?.trim();

      if (!category) continue;

      const itemStatuses = cleanArray(item.statusOptions);
      const itemDescriptions = cleanArray(item.descriptionValues);
      const rawWeightScore = Number(item.weightScore);
      const weightScore = Number.isFinite(rawWeightScore) && rawWeightScore >= 0 ? rawWeightScore : null;

      await new sql.Request(transaction)
        .input('TemplateID', sql.Int, templateId)
        .input('Category', sql.NVarChar(150), category)
        .input('SubCategory', sql.NVarChar(150), item.subCategory?.trim() || null)
        .input('DescriptionValues', sql.NVarChar(sql.MAX), JSON.stringify(itemDescriptions))
        .input('StatusOptions', sql.NVarChar(sql.MAX), JSON.stringify(itemStatuses))
        .input('WeightScore', sql.Decimal(10, 2), includeWeightedScore ? weightScore : null)
        .input('SortOrder', sql.Int, index + 1)
        .query(`
          INSERT INTO dbo.CustomChecklistTemplateItems
            (TemplateID, Category, SubCategory, DescriptionValues, StatusOptions, WeightScore, SortOrder)
          VALUES
            (@TemplateID, @Category, @SubCategory, @DescriptionValues, @StatusOptions, @WeightScore, @SortOrder)
        `);
    }

    await transaction.commit();

    res.json({ success: true, message: 'Checklist template created successfully', templateId });
  } catch (error) {
    if (transaction._aborted !== true) {
      try {
        await transaction.rollback();
      } catch {
      }
    }
    console.error('Error creating checklist template:', error);
    res.status(500).json({ success: false, error: 'Failed to create checklist template', details: error.message });
  }
};

export const updateChecklistTemplate = async (req, res) => {
  const transaction = new sql.Transaction(await getPool());

  try {
    await ensureChecklistTables();
    const templateId = Number(req.params.templateId);

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return res.status(400).json({ success: false, error: 'Valid templateId is required' });
    }

    const {
      checklistName,
      department,
      checklistScope,
      categoryHeader,
      subCategoryHeader,
      descriptionHeaders,
      statusMode,
      includeWeightedScore,
      globalStatuses,
      statusScoreRules,
      includeResponsibilities,
      responsibilities,
      includeReviewedBy,
      reviewedBy,
      includeApprovedBy,
      approvedBy,
      includeTimeline,
      allowImage,
      allowVideo,
      allowAttachment,
      items
    } = req.body;

    const normalizedItems = Array.isArray(items) ? items : [];

    if (!checklistName || !department || !normalizedItems.length) {
      return res.status(400).json({
        success: false,
        error: 'Checklist name, department, and at least one checklist item are required'
      });
    }

    await transaction.begin();

    const updateResult = await new sql.Request(transaction)
      .input('TemplateID', sql.Int, templateId)
      .input('ChecklistName', sql.NVarChar(200), checklistName.trim())
      .input('Department', sql.NVarChar(120), department.trim())
      .input('ChecklistScope', sql.NVarChar(20), checklistScope === 'department' ? 'department' : 'branch')
      .input('CategoryHeader', sql.NVarChar(120), categoryHeader?.trim() || 'Category')
      .input('SubCategoryHeader', sql.NVarChar(120), subCategoryHeader?.trim() || 'Sub Category')
      .input('DescriptionHeaders', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(descriptionHeaders)))
      .input('StatusMode', sql.NVarChar(20), statusMode === 'segment' ? 'segment' : 'global')
      .input('IncludeWeightedScore', sql.Bit, includeWeightedScore ? 1 : 0)
      .input('GlobalStatuses', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(globalStatuses)))
      .input('StatusScoreRules', sql.NVarChar(sql.MAX), JSON.stringify(Array.isArray(statusScoreRules) ? statusScoreRules : []))
      .input('IncludeResponsibilities', sql.Bit, includeResponsibilities ? 1 : 0)
      .input('Responsibilities', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(responsibilities)))
      .input('IncludeReviewedBy', sql.Bit, includeReviewedBy ? 1 : 0)
      .input('ReviewedBy', sql.NVarChar(120), reviewedBy?.trim() || null)
      .input('IncludeApprovedBy', sql.Bit, includeApprovedBy ? 1 : 0)
      .input('ApprovedBy', sql.NVarChar(120), approvedBy?.trim() || null)
      .input('IncludeTimeline', sql.Bit, includeTimeline ? 1 : 0)
      .input('AllowImage', sql.Bit, allowImage ? 1 : 0)
      .input('AllowVideo', sql.Bit, allowVideo ? 1 : 0)
      .input('AllowAttachment', sql.Bit, allowAttachment ? 1 : 0)
      .query(`
        UPDATE dbo.CustomChecklistTemplates
        SET ChecklistName = @ChecklistName,
            Department = @Department,
            ChecklistScope = @ChecklistScope,
          CategoryHeader = @CategoryHeader,
          SubCategoryHeader = @SubCategoryHeader,
            DescriptionHeaders = @DescriptionHeaders,
            StatusMode = @StatusMode,
          IncludeWeightedScore = @IncludeWeightedScore,
            GlobalStatuses = @GlobalStatuses,
            StatusScoreRules = @StatusScoreRules,
            IncludeResponsibilities = @IncludeResponsibilities,
            Responsibilities = @Responsibilities,
            IncludeReviewedBy = @IncludeReviewedBy,
            ReviewedBy = @ReviewedBy,
            IncludeApprovedBy = @IncludeApprovedBy,
            ApprovedBy = @ApprovedBy,
            IncludeTimeline = @IncludeTimeline,
            AllowImage = @AllowImage,
            AllowVideo = @AllowVideo,
            AllowAttachment = @AllowAttachment,
            UpdatedAt = GETDATE()
        WHERE TemplateID = @TemplateID AND IsActive = 1;

        SELECT @@ROWCOUNT AS AffectedRows;
      `);

    if (!updateResult.recordset[0].AffectedRows) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Checklist template not found' });
    }

    await new sql.Request(transaction)
      .input('TemplateID', sql.Int, templateId)
      .query('DELETE FROM dbo.CustomChecklistTemplateItems WHERE TemplateID = @TemplateID');

    for (let index = 0; index < normalizedItems.length; index += 1) {
      const item = normalizedItems[index];
      const category = item.category?.trim();

      if (!category) continue;

      const rawWeightScore = Number(item.weightScore);
      const itemDescriptions = cleanArray(item.descriptionValues);
      const weightScore = Number.isFinite(rawWeightScore) && rawWeightScore >= 0 ? rawWeightScore : null;

      await new sql.Request(transaction)
        .input('TemplateID', sql.Int, templateId)
        .input('Category', sql.NVarChar(150), category)
        .input('SubCategory', sql.NVarChar(150), item.subCategory?.trim() || null)
        .input('DescriptionValues', sql.NVarChar(sql.MAX), JSON.stringify(itemDescriptions))
        .input('StatusOptions', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(item.statusOptions)))
        .input('WeightScore', sql.Decimal(10, 2), includeWeightedScore ? weightScore : null)
        .input('SortOrder', sql.Int, index + 1)
        .query(`
          INSERT INTO dbo.CustomChecklistTemplateItems
            (TemplateID, Category, SubCategory, DescriptionValues, StatusOptions, WeightScore, SortOrder)
          VALUES
            (@TemplateID, @Category, @SubCategory, @DescriptionValues, @StatusOptions, @WeightScore, @SortOrder)
        `);
    }

    await transaction.commit();

    res.json({ success: true, message: 'Checklist template updated successfully' });
  } catch (error) {
    if (transaction._aborted !== true) {
      try {
        await transaction.rollback();
      } catch {
      }
    }
    console.error('Error updating checklist template:', error);
    res.status(500).json({ success: false, error: 'Failed to update checklist template', details: error.message });
  }
};

export const submitChecklistEntry = async (req, res) => {
  const transaction = new sql.Transaction(await getPool());

  try {
    await ensureChecklistTables();

    const {
      templateId,
      branchCode,
      department,
      reviewDate,
      inputterName,
      reviewedBy,
      approvedBy,
      itemValues
    } = req.body;

    const parsedTemplateId = Number(templateId);
    const values = Array.isArray(itemValues) ? itemValues : [];

    if (!Number.isInteger(parsedTemplateId) || parsedTemplateId <= 0 || !values.length) {
      return res.status(400).json({
        success: false,
        error: 'Valid templateId and item values are required'
      });
    }

    await transaction.begin();

    const filledBy = inputterName?.trim() || req.user?.username || req.user?.email || req.user?.userId?.toString() || 'system';
    const reviewDateValue = reviewDate ? new Date(reviewDate) : null;
    const validReviewDate = reviewDateValue && !Number.isNaN(reviewDateValue.getTime()) ? reviewDateValue : null;

    const entryInsertResult = await new sql.Request(transaction)
      .input('TemplateID', sql.Int, parsedTemplateId)
      .input('BranchCode', sql.NVarChar(50), branchCode?.trim() || null)
      .input('Department', sql.NVarChar(120), department?.trim() || null)
      .input('ReviewDate', sql.DateTime2, validReviewDate)
      .input('ReviewedBy', sql.NVarChar(120), reviewedBy?.trim() || null)
      .input('ApprovedBy', sql.NVarChar(120), approvedBy?.trim() || null)
      .input('FilledBy', sql.NVarChar(120), filledBy)
      .query(`
        INSERT INTO dbo.CustomChecklistEntries
          (TemplateID, BranchCode, Department, ReviewDate, ReviewedBy, ApprovedBy, FilledBy)
        VALUES
          (@TemplateID, @BranchCode, @Department, @ReviewDate, @ReviewedBy, @ApprovedBy, @FilledBy);

        SELECT CAST(SCOPE_IDENTITY() AS INT) AS EntryID;
      `);

    const entryId = entryInsertResult.recordset[0].EntryID;

    for (const itemValue of values) {
      const itemId = Number(itemValue.itemId);
      if (!Number.isInteger(itemId) || itemId <= 0) continue;

      await new sql.Request(transaction)
        .input('EntryID', sql.Int, entryId)
        .input('ItemID', sql.Int, itemId)
        .input('SelectedStatus', sql.NVarChar(120), itemValue.selectedStatus?.trim() || null)
        .input('ScoreAwarded', sql.Decimal(10, 2), Number.isFinite(Number(itemValue.scoreAwarded)) ? Number(itemValue.scoreAwarded) : null)
        .input('Remarks', sql.NVarChar(sql.MAX), itemValue.remarks?.trim() || null)
        .input('Responsibilities', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(itemValue.responsibilities)))
        .input('Timeline', sql.NVarChar(50), itemValue.timeline?.trim() || null)
        .input('ImageUrl', sql.NVarChar(500), itemValue.imageUrl?.trim() || (cleanArray(itemValue.imageUrls)[0] || null))
        .input('ImageUrls', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(itemValue.imageUrls)))
        .input('VideoUrl', sql.NVarChar(500), itemValue.videoUrl?.trim() || (cleanArray(itemValue.videoUrls)[0] || null))
        .input('VideoUrls', sql.NVarChar(sql.MAX), JSON.stringify(cleanArray(itemValue.videoUrls)))
        .input('AttachmentUrl', sql.NVarChar(500), itemValue.attachmentUrl?.trim() || null)
        .query(`
          INSERT INTO dbo.CustomChecklistEntryItems
            (EntryID, ItemID, SelectedStatus, ScoreAwarded, Remarks, Responsibilities, Timeline, ImageUrl, ImageUrls, VideoUrl, VideoUrls, AttachmentUrl)
          VALUES
            (@EntryID, @ItemID, @SelectedStatus, @ScoreAwarded, @Remarks, @Responsibilities, @Timeline, @ImageUrl, @ImageUrls, @VideoUrl, @VideoUrls, @AttachmentUrl)
        `);
    }

    await transaction.commit();

    res.json({ success: true, message: 'Checklist submitted successfully', entryId });
  } catch (error) {
    if (transaction._aborted !== true) {
      try {
        await transaction.rollback();
      } catch {
      }
    }
    console.error('Error submitting checklist entry:', error);
    res.status(500).json({ success: false, error: 'Failed to submit checklist entry', details: error.message });
  }
};

export const getChecklistEntryById = async (req, res) => {
  try {
    await ensureChecklistTables();
    const entryId = Number(req.params.entryId);

    if (!Number.isInteger(entryId) || entryId <= 0) {
      return res.status(400).json({ success: false, error: 'Valid entryId is required' });
    }

    const pool = await getPool();

    const entryResult = await pool.request()
      .input('EntryID', sql.Int, entryId)
      .query(`
        SELECT
          e.EntryID,
          e.TemplateID,
          e.BranchCode,
          e.Department,
          e.ReviewDate,
          e.ReviewedBy,
          e.ApprovedBy,
          e.FilledBy,
          e.CreatedAt,
          t.ChecklistName,
          t.ChecklistScope,
          t.CategoryHeader,
          t.SubCategoryHeader,
          t.StatusMode,
          t.IncludeWeightedScore,
          t.GlobalStatuses,
          t.Responsibilities,
          t.AllowImage,
          t.AllowVideo,
          t.AllowAttachment,
          t.IncludeTimeline,
          t.IncludeResponsibilities,
          t.IncludeReviewedBy,
          t.IncludeApprovedBy
        FROM dbo.CustomChecklistEntries e
        INNER JOIN dbo.CustomChecklistTemplates t ON e.TemplateID = t.TemplateID
        WHERE e.EntryID = @EntryID
      `);

    if (!entryResult.recordset.length) {
      return res.status(404).json({ success: false, error: 'Checklist entry not found' });
    }

    const itemsResult = await pool.request()
      .input('EntryID', sql.Int, entryId)
      .query(`
        SELECT
          i.EntryItemID,
          i.ItemID,
          ti.Category,
          ti.SubCategory,
          ti.StatusOptions,
          ti.WeightScore,
          i.SelectedStatus,
          i.ScoreAwarded,
          i.Remarks,
          i.Responsibilities,
          i.Timeline,
          i.ImageUrl,
          i.ImageUrls,
          i.VideoUrl,
          i.VideoUrls,
          i.AttachmentUrl
        FROM dbo.CustomChecklistEntryItems i
        INNER JOIN dbo.CustomChecklistTemplateItems ti ON i.ItemID = ti.ItemID
        WHERE i.EntryID = @EntryID
        ORDER BY ti.SortOrder ASC, i.EntryItemID ASC
      `);

    const entry = entryResult.recordset[0];

    res.json({
      success: true,
      entry: {
        entryId: entry.EntryID,
        templateId: entry.TemplateID,
        checklistName: entry.ChecklistName,
        checklistScope: entry.ChecklistScope,
        categoryHeader: entry.CategoryHeader || 'Category',
        subCategoryHeader: entry.SubCategoryHeader || 'Sub Category',
        statusMode: entry.StatusMode,
        includeWeightedScore: !!entry.IncludeWeightedScore,
        globalStatuses: safeJson(entry.GlobalStatuses, ['Yes', 'No', 'NA']),
        templateResponsibilities: safeJson(entry.Responsibilities, []),
        allowImage: !!entry.AllowImage,
        allowVideo: !!entry.AllowVideo,
        allowAttachment: !!entry.AllowAttachment,
        includeTimeline: !!entry.IncludeTimeline,
        includeResponsibilities: !!entry.IncludeResponsibilities,
        includeReviewedBy: !!entry.IncludeReviewedBy,
        includeApprovedBy: !!entry.IncludeApprovedBy,
        branchCode: entry.BranchCode || '',
        department: entry.Department || '',
        reviewDate: entry.ReviewDate || null,
        reviewedBy: entry.ReviewedBy || '',
        approvedBy: entry.ApprovedBy || '',
        filledBy: entry.FilledBy || '',
        createdAt: entry.CreatedAt,
        items: itemsResult.recordset.map((item) => ({
          entryItemId: item.EntryItemID,
          itemId: item.ItemID,
          category: item.Category,
          subCategory: item.SubCategory || '',
          statusOptions: safeJson(item.StatusOptions, []),
          weightScore: item.WeightScore !== null && item.WeightScore !== undefined ? Number(item.WeightScore) : null,
          selectedStatus: item.SelectedStatus || '',
          scoreAwarded: item.ScoreAwarded !== null && item.ScoreAwarded !== undefined ? Number(item.ScoreAwarded) : null,
          remarks: item.Remarks || '',
          responsibilities: safeJson(item.Responsibilities, []),
          timeline: item.Timeline || '',
          imageUrl: item.ImageUrl || '',
          imageUrls: safeJson(item.ImageUrls, item.ImageUrl ? [item.ImageUrl] : []),
          videoUrl: item.VideoUrl || '',
          videoUrls: safeJson(item.VideoUrls, item.VideoUrl ? [item.VideoUrl] : []),
          attachmentUrl: item.AttachmentUrl || ''
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching checklist entry by id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch checklist entry' });
  }
};
