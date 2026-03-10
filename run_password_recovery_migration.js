import sql from 'mssql';
import fs from 'fs';
import path from 'path';

const config = {
  server: 'PC',
  database: 'DIB',
  user: 'appuser',
  password: 'App@12345',
  options: { encrypt: false, trustServerCertificate: true }
};

async function runMigration() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✓ Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'password_recovery_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.request().query(migrationSQL);
    
    console.log('✓ Password recovery schema migration completed successfully');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

runMigration();
