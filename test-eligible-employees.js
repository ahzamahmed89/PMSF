// Test script to verify eligible employees endpoint
import { getPool } from './server/config/database.js';
import sql from 'mssql';

async function testEligibleEmployees() {
    try {
        console.log('Testing sp_GetEligibleEmployees...');
        const pool = await getPool();
        
        // Test 1: Get all employees (no filters)
        console.log('\n--- Test 1: All Employees (no filters) ---');
        const result1 = await pool.request()
            .input('department', sql.NVarChar, null)
            .input('role', sql.NVarChar, null)
            .input('grade', sql.VarChar, null)
            .execute('sp_GetEligibleEmployees');
        
        console.log(`Found ${result1.recordset.length} employees`);
        if (result1.recordset.length > 0) {
            console.log('Sample employee:', result1.recordset[0]);
        }
        
        // Test 2: Filter by department
        console.log('\n--- Test 2: Branch Operations Department ---');
        const result2 = await pool.request()
            .input('department', sql.NVarChar, 'Branch Operations')
            .input('role', sql.NVarChar, null)
            .input('grade', sql.VarChar, null)
            .execute('sp_GetEligibleEmployees');
        
        console.log(`Found ${result2.recordset.length} employees in Branch Operations`);
        if (result2.recordset.length > 0) {
            result2.recordset.forEach(emp => {
                console.log(`  - ${emp.employee_code}: ${emp.employee_name} (${emp.functional_department})`);
            });
        }
        
        await pool.close();
        console.log('\n✓ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testEligibleEmployees();
