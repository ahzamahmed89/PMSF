import express from 'express'
import { upload } from '../config/upload.js'
import { quizMaterialUpload } from '../config/upload.js'
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
  getPreviousQuarterEntry,
  approveVisit
} from '../controllers/dataController.js'

import {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  submitQuizAttempt,
  getUserAttempts,
  getUserAttemptProgress,
  getAttemptDetails,
  getQuizStatistics,
  deleteQuiz,
  uploadQuizStudyMaterial
} from '../controllers/quizController.js'

import {
  getMarqueeItems,
  addMarqueeItem,
  updateMarqueeItem,
  deleteMarqueeItem,
  toggleMarqueeItem
} from '../controllers/marqueeController.js'

// Import auth and admin controllers
import * as authController from '../controllers/authController.js'
import * as adminController from '../controllers/adminController.js'
import * as auth from '../middleware/auth.js'

const router = express.Router()

// ============================================
// Authentication Routes (Public)
// ============================================

// Login
router.post('/auth/login', authController.login)

// Verify token
router.get('/auth/verify', authController.verifyToken)

// Change password (authenticated)
router.post('/auth/change-password', auth.authenticateToken, authController.changePassword)

// Request password reset
router.post('/auth/request-password-reset', authController.requestPasswordReset)

// Reset password with code
router.post('/auth/reset-password', authController.resetPassword)

// Register new user (admin only)
router.post('/auth/register', auth.authenticateToken, auth.requireRole(['Admin']), authController.register)

// ============================================
// Admin Routes (Admin only)
// ============================================

// User management
router.get('/admin/users', auth.authenticateToken, auth.requireRole(['Admin']), adminController.getAllUsers)
router.post('/admin/users', auth.authenticateToken, auth.requireRole(['Admin']), adminController.createUser)
router.put('/admin/users/:userId', auth.authenticateToken, auth.requireRole(['Admin']), adminController.updateUser)
router.post('/admin/users/:userId/reset-password', auth.authenticateToken, auth.requireRole(['Admin']), adminController.resetPassword)
router.post('/admin/users/:userId/unlock', auth.authenticateToken, auth.requireRole(['Admin']), adminController.unlockAccount)

// Role management
router.get('/admin/roles', auth.authenticateToken, auth.requireRole(['Admin']), adminController.getAllRoles)
router.post('/admin/roles', auth.authenticateToken, auth.requireRole(['Admin']), adminController.createRole)
router.put('/admin/roles/:roleId', auth.authenticateToken, auth.requireRole(['Admin']), adminController.updateRole)
router.get('/admin/roles/:roleId/permissions', auth.authenticateToken, auth.requireRole(['Admin']), adminController.getRolePermissions)

// Permission management
router.get('/admin/permissions', auth.authenticateToken, auth.requireRole(['Admin']), adminController.getAllPermissions)

// Audit logs
router.get('/admin/audit-logs', auth.authenticateToken, auth.requireRole(['Admin']), adminController.getLoginAuditLogs)

// ============================================
// PMSF Data Routes
// ============================================

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

// Approve visit
router.post('/approve-visit/:visitcode', approveVisit)

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

// ============================================
// Quiz Routes
// ============================================

// Get all active quizzes
router.get('/quizzes', getAllQuizzes)

// Get quiz by ID with questions and answers
router.get('/quizzes/:quizId', getQuizById)

// Create new quiz
router.post('/quizzes', createQuiz)

// Upload study material for quiz (PDF/Word/PowerPoint)
router.post('/quizzes/upload-study-material', quizMaterialUpload.single('materialFile'), uploadQuizStudyMaterial)

// Update existing quiz
router.put('/quizzes/:quizId', updateQuiz)

// Submit quiz attempt
router.post('/quiz-attempts', submitQuizAttempt)

// Get user's quiz attempt history
router.get('/quiz-attempts/user/:userId', getUserAttempts)

// Get user's per-quiz attempt progress summary
router.get('/quiz-attempts/progress/:userId', getUserAttemptProgress)

// Get attempt details with answers
router.get('/quiz-attempts/:attemptId', getAttemptDetails)

// Get quiz statistics
router.get('/quizzes/:quizId/statistics', getQuizStatistics)

// Delete quiz (soft delete)
router.delete('/quizzes/:quizId', deleteQuiz)

// ===== Marquee Routes =====
// Get all active marquee items (public)
router.get('/marquee-items', getMarqueeItems)

// Add new marquee item (requires authentication)
router.post('/marquee-items', auth.authenticateToken, addMarqueeItem)

// Update marquee item (requires authentication)
router.put('/marquee-items/:id', auth.authenticateToken, updateMarqueeItem)

// Delete marquee item (requires authentication)
router.delete('/marquee-items/:id', auth.authenticateToken, deleteMarqueeItem)

// Toggle marquee item enabled/disabled status (requires authentication)
router.patch('/marquee-items/:id/toggle', auth.authenticateToken, toggleMarqueeItem)

export default router
