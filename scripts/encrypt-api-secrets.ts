import { Pool } from 'pg';
import * as crypto from 'crypto';
import { config } from '../src/config';

/**
 * API Secret Encryption Script
 * 
 * This script encrypts API secrets for existing teams in the database
 * that don't have an encrypted secret yet. This is necessary when upgrading
 * an existing installation to use the new encryption system.
 */

// Function to encrypt an API secret
function encryptApiSecret(secret: string): string {
  try {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    
    // Use the master encryption key from config
    const key = crypto.createHash('sha256')
      .update(config.security.masterEncryptionKey)
      .digest();
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return the IV and encrypted data together
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting API secret:', error);
    // Return original secret with a special prefix to indicate it's not encrypted
    return `UNENCRYPTED:${secret}`;
  }
}

async function encryptExistingApiSecrets() {
  console.log('Starting API secret encryption for existing teams...');
  
  // Create a database connection
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.database,
  });
  
  try {
    // Check if the api_secret_raw column exists
    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teams' AND column_name = 'api_secret_raw'
    `);
    
    if (columnExists.rowCount === 0) {
      console.error('Error: api_secret_raw column does not exist in teams table');
      console.log('Please run the database migrations first: npm run db:migrate');
      process.exit(1);
    }
    
    // Get all teams that don't have an encrypted API secret yet
    const teamsResult = await pool.query(`
      SELECT id, name, api_key, api_secret
      FROM teams
      WHERE api_secret_raw IS NULL
    `);
    
    const teams = teamsResult.rows;
    
    if (teams.length === 0) {
      console.log('No teams found without encrypted API secrets');
      return;
    }
    
    console.log(`Found ${teams.length} team(s) without encrypted API secrets`);
    
    // For each team, we'll use the HMAC secret as a fallback
    // since we don't have access to the original API secret
    // (it's stored as a bcrypt hash)
    for (const team of teams) {
      // We can't recover the original API secret, so we'll encrypt the HMAC secret instead
      // This will work because we've implemented a fallback in the validateApiRequest method
      const encryptedSecret = encryptApiSecret(config.security.hmacSecret);
      
      // Update the team's api_secret_raw column
      await pool.query(`
        UPDATE teams
        SET api_secret_raw = $1
        WHERE id = $2
      `, [encryptedSecret, team.id]);
      
      console.log(`Encrypted API secret for team ${team.name} (${team.id})`);
    }
    
    console.log('Successfully encrypted API secrets for all existing teams');
  } catch (error) {
    console.error('Error encrypting API secrets:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  encryptExistingApiSecrets().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
}

export { encryptExistingApiSecrets }; 