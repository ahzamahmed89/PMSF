// Password Hash Generator for User Setup
// This script generates bcrypt hashes for user passwords

import bcrypt from 'bcrypt';
import sql from 'mssql';

const SALT_ROUNDS = 10;

// Database configuration
const config = {
  server: 'PC',
  database: 'DIB',
  user: 'appuser',
  password: 'App@12345',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Default passwords for users (change these before running!)
const userPasswords = [
  { username: 'admin.user', password: 'Admin@123' },
  { username: 'Staff.1', password: 'Staff@123' },
  { username: 'staff.2', password: 'Staff@456' }
];

async function generateAndUpdatePasswords() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!\n');

    for (const user of userPasswords) {
      console.log(`Processing user: ${user.username}`);
      
      // Generate bcrypt hash
      const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
      console.log(`  Password: ${user.password}`);
      console.log(`  Hash generated: ${hash.substring(0, 20)}...`);
      
      // Convert hash string to buffer
      const hashBuffer = Buffer.from(hash);
      
      // Update database
      const result = await pool.request()
        .input('username', sql.NVarChar(50), user.username)
        .input('passwordHash', sql.VarBinary(256), hashBuffer)
        .query(`
          UPDATE UserLogins
          SET PasswordHash = @passwordHash,
              LastPasswordChangeDate = GETDATE()
          WHERE Username = @username
        `);
      
      if (result.rowsAffected[0] > 0) {
        console.log(`  ✅ Password updated successfully\n`);
      } else {
        console.log(`  ❌ User not found in database\n`);
      }
    }

    console.log('============================================');
    console.log('All passwords updated successfully!');
    console.log('============================================');
    console.log('\nYou can now login with:');
    userPasswords.forEach(user => {
      console.log(`  Username: ${user.username}`);
      console.log(`  Password: ${user.password}\n`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the script
console.log('============================================');
console.log('Password Hash Generator');
console.log('============================================\n');

generateAndUpdatePasswords();
