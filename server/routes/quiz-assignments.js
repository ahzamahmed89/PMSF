import express from 'express';
import * as quizAssignmentController from '../controllers/quizAssignmentController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all assignments
router.get('/', quizAssignmentController.getAllAssignments);

// Get employee dashboard view
router.get('/dashboard', quizAssignmentController.getEmployeeDashboard);

// Get my assigned quizzes (employee view)
router.get('/my-quizzes', quizAssignmentController.getMyAssignedQuizzes);

// Get assignment statistics
router.get('/:id/statistics', quizAssignmentController.getAssignmentStatistics);

// Get single assignment details
router.get('/:id', quizAssignmentController.getAssignmentById);

// Create new assignment (Admin or Editor only)
router.post('/', requireRole(['Admin', 'Editor']), quizAssignmentController.createAssignment);

// Refresh period attempts (Admin or Editor only)
router.post('/refresh-period', requireRole(['Admin', 'Editor']), quizAssignmentController.refreshPeriodAttempts);

// Update assignment (Admin or Editor only)
router.put('/:id', requireRole(['Admin', 'Editor']), quizAssignmentController.updateAssignment);

// Delete assignment (Admin only)
router.delete('/:id', requireRole(['Admin']), quizAssignmentController.deleteAssignment);

export default router;
