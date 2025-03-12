import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

/**
 * Database Migration Runner
 * 
 * This script applies database migrations to keep the schema in sync
 * with the latest version of the application.
 */
async function runMigrations() {
  console.log('Starting database migrations...');
  
  // Create a new database connection
  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.username,
    password: config.database.password,
    database: config.database.database,
  });

  try {
    // Get all migration files from the migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in correct order

    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Apply each migration
    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}`);
      
      // Read migration SQL
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute the migration
      await pool.query(migrationSql);
      
      console.log(`Successfully applied migration: ${file}`);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

export { runMigrations }; 