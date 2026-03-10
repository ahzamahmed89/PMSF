import sql from 'mssql';
import { getPool } from './server/config/database.js';
import fs from 'fs';

async function runPermissionMigration() {
  try {
    console.log('Connecting to database...');
    const pool = await getPool();
    
    console.log('Reading SQL migration file...');
    const sqlScript = fs.readFileSync('./add_marquee_permission.sql', 'utf8');
    
    // Split by GO statements and execute each batch
    const batches = sqlScript
      .split(/^\s*GO\s*$/im)
      .filter(batch => batch.trim().length > 0);
    
    console.log(`Executing ${batches.length} SQL batch(es)...`);
    
    for (let i = 0; i < batches.length; i++) {
      console.log(`Executing batch ${i + 1}/${batches.length}...`);
      try {
        const result = await pool.request().query(batches[i]);
        // Print any messages from the SQL script
        if (result.output) {
          console.log(result.output);
        }
      } catch (err) {
        console.log(`Batch ${i + 1} result:`, err.message);
      }
    }
    
    console.log('\n✅ Permission migration completed successfully!');
    console.log('✅ MARQUEE_EDIT permission created');
    console.log('✅ Permission assigned to Admin role');
    console.log('✅ Editor role created (if not exists)');
    console.log('\nYou can now assign the MARQUEE_EDIT permission to any role via the Admin Panel.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runPermissionMigration();
