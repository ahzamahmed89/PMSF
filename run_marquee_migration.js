import sql from 'mssql';
import { getPool } from './server/config/database.js';
import fs from 'fs';

async function runMarqueeMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await getPool();
    
    console.log('Reading SQL migration file...');
    const sqlScript = fs.readFileSync('./database_schema_marquee.sql', 'utf8');
    
    // Split by GO statements and execute each batch
    const batches = sqlScript
      .split(/^\s*GO\s*$/im)
      .filter(batch => batch.trim().length > 0);
    
    console.log(`Executing ${batches.length} SQL batch(es)...`);
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`Executing batch ${i + 1}/${batches.length}...`);
      await pool.request().query(batches[i]);
    }
    
    console.log('✅ Marquee migration completed successfully!');
    console.log('✅ marquee_items table created');
    console.log('✅ Default marquee items inserted');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMarqueeMigration();
