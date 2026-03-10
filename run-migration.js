import { getPool } from './server/config/database.js';
import fs from 'fs';

async function runMigration() {
  try {
    const targetFile = process.argv[2] || 'add_quiz_material_and_attempt_limit.sql';

    console.log('Connecting to database...');
    const pool = await getPool();
    
    if (!fs.existsSync(targetFile)) {
      throw new Error(`SQL file not found: ${targetFile}`);
    }

    console.log(`Reading SQL file: ${targetFile}`);
    const sql = fs.readFileSync(targetFile, 'utf8');
    
    // Split by GO statements and execute each batch
    const batches = sql.split(/^\s*GO\s*$/gim).filter(batch => batch.trim());
    
    console.log(`Executing ${batches.length} SQL batch(es)...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`\nExecuting batch ${i + 1}...`);
        const result = await pool.request().query(batch);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
          console.log(`✓ Batch ${i + 1} completed (${result.rowsAffected[0]} rows affected)`);
        } else {
          console.log(`✓ Batch ${i + 1} completed`);
        }
      }
    }
    
    console.log(`\n✅ SQL execution completed successfully for: ${targetFile}`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
