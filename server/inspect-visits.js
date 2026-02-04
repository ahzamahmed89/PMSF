import { getPool } from './config/database.js'

async function inspectVisits() {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Visits'
      ORDER BY ORDINAL_POSITION
    `)
    console.log(JSON.stringify(result.recordset, null, 2))
    await pool.close()
  } catch (error) {
    console.error('Error:', error.message)
  }
}

inspectVisits()
