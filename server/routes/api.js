import express from 'express'
import { upload } from '../config/upload.js'
import { 
  getPMSFMaster, 
  addPMSFMaster, 
  updatePMSFMaster, 
  deletePMSFMaster,
  bulkUpdatePMSFMaster,
  getNextAvailableCodes,
  syncPMSFMaster,
  getBranchByCode,
  checkVisitAndGetPMSF,
  submitPMSFForm,
  uploadMedia,
  getExistingPMSFData,
  updatePMSFFormSubmission,
  getVisitData,
  getPreviousQuarterEntry
} from '../controllers/dataController.js'

const router = express.Router()

// Get all data from PMSFMaster table
router.get('/pmsf-master', getPMSFMaster)

// Get next available codes
router.get('/pmsf-master/next-codes', getNextAvailableCodes)

// Get branch details by code (must be before /:code routes)
router.get('/branch/:code', getBranchByCode)

// Check visit and get PMSF data (must be before /:code routes)
router.get('/check-visit/:branchCode', checkVisitAndGetPMSF)

// Get existing PMSF data for editing
router.get('/pmsf-data/:visitcode', getExistingPMSFData)

// Get visit data by branch, year, and quarter
router.get('/visit-data/:branchCode/:year/:qtr', getVisitData)

// Get previous quarter entry for comparison
router.get('/previous-quarter/:branchCode/:year/:quarter', getPreviousQuarterEntry)

// Add new record
router.post('/pmsf-master', addPMSFMaster)

// Bulk update (must be before :code route)
router.put('/pmsf-master/bulk-update', bulkUpdatePMSFMaster)

// Sync endpoint (mixed INSERT/UPDATE with re-indexing)
router.post('/pmsf-master/sync', syncPMSFMaster)

// Upload media files (images/videos)
router.post('/upload-media', upload.array('files', 4), uploadMedia)

// Submit PMSF form
router.post('/submit-pmsf-form', submitPMSFForm)

// Update existing PMSF form submission
router.post('/update-pmsf-form', updatePMSFFormSubmission)

// Update record
router.put('/pmsf-master/:code', updatePMSFMaster)

// Delete record (mark as deleted)
router.delete('/pmsf-master/:code', deletePMSFMaster)

export default router
