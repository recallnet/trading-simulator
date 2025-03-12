/**
 * Setup script for initializing the database for E2E tests
 * 
 * This script:
 * 1. Creates the test database if it doesn't exist
 * 2. Initializes the database schema
 * 3. Applies any necessary migrations
 */

import { Pool } from 'pg';
import { spawnSync } from 'child_process';
import path from 'path';
import { config } from 'dotenv';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

async function setupDatabase() {
  console.log('🗄️ Setting up test database...');
  
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USERNAME = 'postgres',
    DB_PASSWORD = 'postgres',
    DB_NAME = 'solana_trading_simulator_test'
  } = process.env;

  // Connect to the default postgres database to check if our test DB exists
  const pgPool = new Pool({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    // Check if our database exists
    const { rows } = await pgPool.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [DB_NAME]);

    // Create the database if it doesn't exist
    if (rows.length === 0) {
      console.log(`Creating database: ${DB_NAME}`);
      await pgPool.query(`CREATE DATABASE ${DB_NAME}`);
      console.log('Database created');
    } else {
      console.log(`Database ${DB_NAME} already exists`);
    }
  } finally {
    await pgPool.end();
  }

  // Now initialize the schema using the application's scripts
  console.log('Initializing database schema...');
  
  // Run the DB initialization script
  const initResult = spawnSync('npx', ['ts-node', 'scripts/setup-db.ts'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DB_NAME: DB_NAME
    },
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..')
  });

  if (initResult.status !== 0) {
    throw new Error(`Failed to initialize database schema: exit code ${initResult.status}`);
  }

  // Run any additional migrations for tests
  console.log('Applying migrations...');
  
  const migrationResult = spawnSync('npx', ['ts-node', 'scripts/add-admin-field.ts'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DB_NAME: DB_NAME
    },
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..')
  });

  if (migrationResult.status !== 0) {
    console.warn('Warning: Migration may have failed, but this could be because it was already applied');
  }

  console.log('✅ Database setup complete');
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('Database setup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database setup failed:', error);
    process.exit(1);
  }); 