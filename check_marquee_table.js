import { initializePool, getPool } from './server/config/database.js';

async function checkTable() {
  try {
    // Initialize the pool
    await initializePool();
    const pool = await getPool();
    
    // Check if table exists
    const tableCheck = await pool.request().query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'marquee_items'"
    );
    
    if (tableCheck.recordset.length === 0) {
      console.log('❌ Table "marquee_items" does NOT exist');
      process.exit(1);
    }
    
    console.log('✅ Table "marquee_items" EXISTS\n');
    
    // Get column info
    const columnCheck = await pool.request().query(
      "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'marquee_items' ORDER BY ORDINAL_POSITION"
    );
    
    console.log('Columns:');
    console.log('─'.repeat(80));
    columnCheck.recordset.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'Nullable' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? ` (Default: ${col.COLUMN_DEFAULT})` : '';
      console.log(`${col.COLUMN_NAME.padEnd(20)} | ${col.DATA_TYPE.padEnd(15)} | ${nullable}${defaultVal}`);
    });
    
    // Get row count
    const countCheck = await pool.request().query('SELECT COUNT(*) as count FROM marquee_items');
    console.log('\n' + '─'.repeat(80));
    console.log(`Total items in table: ${countCheck.recordset[0].count}`);
    
    pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTable();
