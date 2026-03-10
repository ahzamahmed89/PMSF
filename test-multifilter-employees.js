// Test script to verify multi-filter functionality
import { getPool } from './server/config/database.js';
import sql from 'mssql';

async function testMultiFilterEmployees() {
    try {
        console.log('Testing multi-filter employee selection...\n');
        const pool = await getPool();
        
        // Test 1: Multiple departments
        console.log('--- Test 1: Multiple Departments (Branch Operations + IT) ---');
        const depts = ['Branch Operations', 'IT'];
        let query = `
            SELECT COUNT(*) as count
            FROM employees
            WHERE is_active = 1 AND functional_department IN ('Branch Operations', 'IT')
        `;
        let result = await pool.request().query(query);
        console.log(`Found ${result.recordset[0].count} employees in Branch Operations + IT`);
        
        // Test 2: Multiple roles
        console.log('\n--- Test 2: Multiple Roles (Branch Manager + RM) ---');
        query = `
            SELECT COUNT(*) as count
            FROM employees
            WHERE is_active = 1 AND functional_role IN ('Branch Manager', 'RM')
        `;
        result = await pool.request().query(query);
        console.log(`Found ${result.recordset[0].count} employees with Branch Manager + RM roles`);
        
        // Test 3: Multiple grades
        console.log('\n--- Test 3: Multiple Grades (G5 + G6) ---');
        query = `
            SELECT COUNT(*) as count
            FROM employees
            WHERE is_active = 1 AND grade IN ('G5', 'G6')
        `;
        result = await pool.request().query(query);
        console.log(`Found ${result.recordset[0].count} employees in G5 + G6 grades`);
        
        // Test 4: Combined filters
        console.log('\n--- Test 4: Combined Filters (IT Dept + G5/G6 Grades) ---');
        query = `
            SELECT 
                employee_code, employee_name, functional_department, functional_role, grade
            FROM employees
            WHERE is_active = 1 
                AND functional_department IN ('IT')
                AND grade IN ('G5', 'G6')
            ORDER BY employee_name
        `;
        result = await pool.request().query(query);
        console.log(`Found ${result.recordset.length} employees:`);
        result.recordset.forEach(emp => {
            console.log(`  - ${emp.employee_code}: ${emp.employee_name} (${emp.functional_department}, ${emp.functional_role}, ${emp.grade})`);
        });
        
        await pool.close();
        console.log('\n✓ Multi-filter tests completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testMultiFilterEmployees();
