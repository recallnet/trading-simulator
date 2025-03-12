import { initializeDatabase } from '../src/database';
import { addAdminField } from './add-admin-field';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../src/database/migrate';

/**
 * Database Setup Script
 * Initializes the PostgreSQL database for the trading simulator
 * and ensures all migrations are applied
 */
const setupDatabase = async () => {
  try {
    console.log('Starting database initialization...');
    
    // Initialize base database schema
    await initializeDatabase();
    
    // Ensure migrations directory exists
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log(`Creating migrations directory: ${migrationsDir}`);
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Apply all migrations to ensure the database is fully up-to-date
    // This is important when starting from scratch to ensure all schema elements exist
    console.log('\nEnsuring all migrations are applied...');
    
    // Run the admin field migration (legacy migration)
    // This is safe to run even if the field already exists, as the migration checks first
    await addAdminField();
    
    // Run all new migrations
    await runMigrations();
    
    console.log('\nDatabase initialization and migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

// Run the setup
setupDatabase(); 