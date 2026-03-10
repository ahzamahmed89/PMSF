import sql from 'mssql';

const config = {
  server: 'PC',
  database: 'DIB',
  user: 'appuser',
  password: 'App@12345',
  options: { encrypt: false, trustServerCertificate: true }
};

async function checkTable() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Visits'");
    
    if (result.recordset.length > 0) {
      console.log('✓ dbo.Visits table EXISTS');
      
      // Get table columns
      const columnsResult = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Visits'");
      console.log('\nColumns in dbo.Visits:');
      columnsResult.recordset.forEach(col => console.log('  -', col.COLUMN_NAME));
    } else {
      console.log('✗ dbo.Visits table DOES NOT EXIST');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
    process.exit(0);
  }
}

checkTable();
