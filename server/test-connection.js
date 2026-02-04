import { initializePool } from './config/database.js'

async function testConnection() {
  console.log('Testing MSSQL connection...')
  try {
    const pool = await initializePool()
    console.log('✓ Successfully connected to MSSQL database')
    
    // Test a simple query
    const result = await pool.request().query('SELECT @@VERSION as version')
    console.log('✓ Database query successful')
    console.log('Database version:', result.recordset[0].version)
    
    await pool.close()
    console.log('✓ Connection closed')
  } catch (error) {
    console.error('✗ Connection failed:', error.message)
    console.error('\nPlease check:')
    console.error('1. MSSQL server is running')
    console.error('2. Server address is correct in .env file')
    console.error('3. Database name exists')
    console.error('4. Username and password are correct')
    console.error('5. Server allows remote connections (if not localhost)')
    process.exit(1)
  }
}

testConnection()
