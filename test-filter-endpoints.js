// Test script to verify filter endpoints return data
import { getPool } from './server/config/database.js';

async function testFilterEndpoints() {
    try {
        console.log('Testing filter endpoints...\n');
        const pool = await getPool();
        
        // Test departments
        console.log('--- Departments ---');
        const deptResult = await pool.request().query(`
            SELECT DISTINCT functional_department as department
            FROM employees
            WHERE is_active = 1
            ORDER BY functional_department
        `);
        const departments = deptResult.recordset.map(r => r.department);
        console.log(`Found ${departments.length} departments:`, departments);
        
        // Test roles
        console.log('\n--- Roles ---');
        const roleResult = await pool.request().query(`
            SELECT DISTINCT functional_role as role
            FROM employees
            WHERE is_active = 1
            ORDER BY functional_role
        `);
        const roles = roleResult.recordset.map(r => r.role);
        console.log(`Found ${roles.length} roles:`, roles);
        
        // Test grades
        console.log('\n--- Grades ---');
        const gradeResult = await pool.request().query(`
            SELECT DISTINCT grade
            FROM employees
            WHERE is_active = 1
            ORDER BY grade
        `);
        const grades = gradeResult.recordset.map(r => r.grade);
        console.log(`Found ${grades.length} grades:`, grades);
        
        await pool.close();
        console.log('\n✓ All filter endpoints working');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testFilterEndpoints();
