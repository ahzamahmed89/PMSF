const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Database configuration
const config = {
  user: 'appuser',
  password: 'app123',
  server: 'PC',
  database: 'DIB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await sql.connect(config);
    console.log('Connected successfully\n');

    // Read the SQL migration file
    const migrationFile = path.join(__dirname, 'add_question_time_column.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    console.log('Running migration to add time_seconds column to quiz_questions...\n');
    
    // Execute the migration
    const result = await sql.query(migrationSQL);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('Added time_seconds column to quiz_questions table');
    
    await sql.close();
    console.log('\nDatabase connection closed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
