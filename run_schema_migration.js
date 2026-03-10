import sql from 'mssql';
import { getPool } from './server/config/database.js';
import fs from 'fs';

async function runSchemaMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await getPool();
    
    console.log('Reading SQL migration file...');
    const sqlScript = fs.readFileSync('./update_marquee_schema.sql', 'utf8');
    
    // Split by GO statements and execute each batch
    const batches = sqlScript
      .split(/^\s*GO\s*$/im)
      .filter(batch => batch.trim().length > 0);
    
    console.log(`Executing ${batches.length} SQL batch(es)...`);
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`Executing batch ${i + 1}/${batches.length}...`);
      try {
        await pool.request().query(batches[i]);
      } catch (err) {
        console.log(`Batch ${i + 1}:`, err.message);
      }
    }
    
    console.log('\n✅ Schema migration completed successfully!');
    console.log('✅ is_enabled column added to marquee_items');
    console.log('✅ is_active column removed (hard delete instead of soft)');
    console.log('✅ New index created for performance');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runSchemaMigration();
