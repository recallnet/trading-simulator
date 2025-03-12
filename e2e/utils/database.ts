import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync, spawnSync } from 'child_process';
import path from 'path';

let pool: Pool | null = null;

/**
 * Initialize the database for testing
 * - Creates a fresh database if it doesn't exist
 * - Runs the initialization script
 */
export async function initializeDb(): Promise<void> {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USERNAME = 'postgres',
    DB_PASSWORD = 'postgres',
    DB_NAME = 'solana_trading_simulator_test',
  } = process.env;

  try {
    // Connect to postgres first to check if our database exists
    const adminPool = new Pool({
      host: DB_HOST,
      port: parseInt(DB_PORT),
      user: DB_USERNAME,
      password: DB_PASSWORD,
      database: 'postgres' // Connect to default database
    });

    try {
      // Check if our database exists
      const { rows } = await adminPool.query(`
        SELECT 1 FROM pg_database WHERE datname = $1
      `, [DB_NAME]);

      // If database doesn't exist, create it
      if (rows.length === 0) {
        console.log(`Database ${DB_NAME} does not exist, creating it...`);
        await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
        console.log(`Database ${DB_NAME} created successfully`);
      } else {
        console.log(`Database ${DB_NAME} already exists`);
      }
    } finally {
      // Close the admin connection
      await adminPool.end();
    }

    // Now connect to our test database
    pool = new Pool({
      host: DB_HOST,
      port: parseInt(DB_PORT),
      user: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    // Check if we can connect to the database
    await pool.query('SELECT 1');
    console.log(`Connected to database: ${DB_NAME}`);
    
    // Initialize the database schema by running the setup script
    console.log('Initializing database schema...');
    
    const result = spawnSync('npx', ['ts-node', 'scripts/setup-db.ts'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DB_NAME: DB_NAME
      },
      stdio: 'inherit'
    });
    
    if (result.status !== 0) {
      throw new Error(`Database schema initialization failed with code ${result.status}`);
    }
    
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get a database client from the pool
 */
export function getDb(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  return pool;
}

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
}

/**
 * Reset the database to a clean state
 * - Truncates all tables
 * - Resets sequences
 */
export async function resetDb(): Promise<void> {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Disable foreign key constraints temporarily
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != 'migrations'
    `);
    
    // Truncate all tables except migrations
    if (tablesResult.rows.length > 0) {
      const tables = tablesResult.rows.map(row => `"${row.tablename}"`).join(', ');
      if (tables) {
        await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Database reset complete');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Failed to reset database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cleanup the test database after tests
 */
export async function cleanupDatabase(): Promise<void> {
  console.log('🧹 Cleaning up test database...');
  
  try {
    // Clean strategy 1: Truncate all tables
    if (process.env.DB_CLEANUP_STRATEGY === 'truncate' && pool) {
      // Get all table names from public schema
      const { rows } = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      // Disable triggers to allow truncating tables with foreign keys
      await pool.query('SET session_replication_role = replica;');
      
      // Truncate all tables
      for (const { table_name } of rows) {
        await pool.query(`TRUNCATE TABLE "${table_name}" CASCADE`);
      }
      
      // Enable triggers again
      await pool.query('SET session_replication_role = DEFAULT;');
    }
    // Clean strategy 2: Execute app's db:clean command 
    else if (process.env.DB_CLEANUP_STRATEGY === 'app') {
      execSync('npm run db:clean', { stdio: 'inherit' });
    }
    // Clean strategy 3: Drop and recreate the database
    else if (process.env.DB_CLEANUP_STRATEGY === 'drop') {
      // This is destructive and requires superuser privileges
      console.warn('⚠️ Drop strategy not implemented in E2E tests for safety reasons');
    }
    
    console.log('✅ Database cleanup complete');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  } finally {
    // Close the database connection pool
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Get the database connection pool for test-specific queries
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  return pool;
} 