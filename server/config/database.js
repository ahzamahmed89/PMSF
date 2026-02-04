import sql from 'mssql'

const config = {
  server: process.env.DB_SERVER || 'PC',
  database: process.env.DB_NAME || 'DIB',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'App@12345',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
}

let pool

async function initializePool() {
  try {
    pool = new sql.ConnectionPool(config)
    await pool.connect()
    console.log('Connected to MSSQL database')
    return pool
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}

async function getPool() {
  if (!pool) {
    await initializePool()
  }
  return pool
}

export { getPool, initializePool }
