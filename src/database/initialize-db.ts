import { DatabaseConnection } from './connection';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize the database
 * Creates tables and indices if they don't exist
 */
export async function initializeDatabase(): Promise<void> {
  const db = DatabaseConnection.getInstance();
  
  try {
    console.log('[Database] Checking database connection and schema...');
    
    // First check if the database schema is already initialized
    // by checking for a critical table (teams)
    const tableCheckResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'teams'
      );
    `);
    
    const tablesExist = tableCheckResult.rows[0]?.exists;
    
    if (tablesExist) {
      console.log('[Database] Database schema already initialized, skipping initialization');
      return;
    }
    
    console.log('[Database] Tables not found, initializing database schema...');
    
    // Read SQL file
    const sqlFile = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL script as a whole
    await db.query(sql);
    
    console.log('[Database] Database schema initialized successfully');
  } catch (error) {
    // If there's a database connection error, we should log but not fail server startup
    console.error('[Database] Error during database schema check/initialization:', error);
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Database] Continuing server startup despite database error in production mode');
    } else {
      throw error; // In development, we want to fail fast
    }
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
} 