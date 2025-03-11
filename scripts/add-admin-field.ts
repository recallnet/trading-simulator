import { DatabaseConnection } from '../src/database/connection';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment is loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Colors for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

/**
 * Migration script to add is_admin field to teams table
 * This is safe to run multiple times and during initial setup
 */
const addAdminField = async () => {
  console.log(`${colors.blue}Checking database for is_admin field...${colors.reset}`);
  
  const db = DatabaseConnection.getInstance();
  
  try {
    // Check if the teams table exists
    console.log('Checking if teams table exists...');
    const tableResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'teams'
      )
    `);
    
    const tableExists = tableResult.rows[0]?.exists;
    if (!tableExists) {
      console.log(`${colors.yellow}Teams table doesn't exist yet, migration not needed${colors.reset}`);
      return;
    }
    
    // Check if the field already exists
    console.log('Checking if is_admin field already exists...');
    const checkResult = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'teams' AND column_name = 'is_admin'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log(`${colors.green}✓ is_admin field already exists, migration not needed${colors.reset}`);
      return;
    }
    
    // Begin transaction
    console.log('Starting database transaction...');
    await db.query('BEGIN');
    
    try {
      // Add is_admin field to teams table
      console.log('Adding is_admin field to teams table...');
      await db.query(`
        ALTER TABLE teams
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
      `);
      
      // Create index on is_admin field
      console.log('Creating index on is_admin field...');
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_teams_is_admin ON teams(is_admin)
      `);
      
      // Update existing admin accounts (those with admin_ prefix in API key)
      console.log('Updating existing admin accounts...');
      const updateResult = await db.query(`
        UPDATE teams
        SET is_admin = TRUE
        WHERE api_key LIKE 'admin_%'
      `);
      
      const updatedCount = updateResult.rowCount || 0;
      
      // Commit transaction
      console.log('Committing transaction...');
      await db.query('COMMIT');
      
      console.log(`${colors.green}✓ Migration completed successfully${colors.reset}`);
      console.log(`${colors.green}✓ Added is_admin field to teams table${colors.reset}`);
      if (updatedCount > 0) {
        console.log(`${colors.green}✓ Updated ${updatedCount} existing admin accounts${colors.reset}`);
      }
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(`${colors.red}Error during migration:${colors.reset}`, error);
    throw error;
  } finally {
    try {
      // Close connection
      await db.close();
    } catch (error) {
      // Ignore errors on connection close
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  addAdminField()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export { addAdminField }; 