import express from 'express';
import * as employeeController from '../controllers/employeeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all employees (with optional filters)
router.get('/', employeeController.getAllEmployees);

// Get unique departments, roles, grades (for filters)
router.get('/departments', employeeController.getDepartments);
router.get('/roles', employeeController.getRoles);
router.get('/grades', employeeController.getGrades);

// Get eligible employees for quiz assignment
router.get('/eligible', employeeController.getEligibleEmployees);

// Get single employee
router.get('/:id', employeeController.getEmployeeById);

// Create employee (Admin or Editor only)
router.post('/', requireRole(['Admin', 'Editor']), employeeController.createEmployee);

// Bulk import employees (Admin or Editor only)
router.post('/bulk-import/preview', requireRole(['Admin', 'Editor']), employeeController.previewBulkImportEmployees);
router.post('/bulk-import', requireRole(['Admin', 'Editor']), employeeController.bulkImportEmployees);

// Update employee (Admin or Editor only)
router.put('/:id', requireRole(['Admin', 'Editor']), employeeController.updateEmployee);

// Delete employee (Admin only)
router.delete('/:id', requireRole(['Admin']), employeeController.deleteEmployee);

export default router;
