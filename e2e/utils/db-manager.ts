import { Pool, PoolClient } from 'pg';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

/**
 * Database Manager for E2E Tests
 * 
 * This utility provides a standardized way to manage database connections,
 * schema, and state for end-to-end tests.
 * 
 * Features:
 * - Single connection pool shared across all tests
 * - Connection tracking and proper cleanup
 * - Proper database initialization and teardown
 * - Support for test-specific migrations
 */
export class DbManager {
  private static instance: DbManager;
  private pool: Pool | null = null;
  private activeConnections = 0;
  private initialized = false;
  private migrationApplied = new Set<string>();
  
  // Database configuration from environment variables
  private config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'solana_trading_simulator_test'
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Load environment variables if not already loaded
    config({ path: path.resolve(__dirname, '../../.env.test') });
  }

  /**
   * Get the singleton instance of the database manager
   */
  public static getInstance(): DbManager {
    if (!DbManager.instance) {
      DbManager.instance = new DbManager();
    }
    return DbManager.instance;
  }

  /**
   * Initialize the database for testing
   * - Creates a fresh database if it doesn't exist
   * - Runs the initialization script
   * - Applies base migrations
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Database already initialized');
      return;
    }

    console.log('🗄️ Initializing test database...');
    
    try {
      // Connect to postgres first to check if our database exists
      const adminPool = new Pool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: 'postgres' // Connect to default database
      });

      try {
        // Check if our database exists
        const { rows } = await adminPool.query(`
          SELECT 1 FROM pg_database WHERE datname = $1
        `, [this.config.database]);

        // If database doesn't exist, create it
        if (rows.length === 0) {
          console.log(`Database ${this.config.database} does not exist, creating it...`);
          await adminPool.query(`CREATE DATABASE ${this.config.database}`);
          console.log(`Database ${this.config.database} created successfully`);
        } else {
          console.log(`Database ${this.config.database} already exists`);
        }
      } finally {
        // Close the admin connection
        await adminPool.end();
      }

      // Now connect to our test database
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });

      // Add event handlers for connection tracking
      this.pool.on('connect', () => {
        this.activeConnections++;
        console.log(`DB connection opened (Total: ${this.activeConnections})`);
      });

      this.pool.on('release', () => {
        this.activeConnections--;
        console.log(`DB connection released (Total: ${this.activeConnections})`);
      });

      // Check if we can connect to the database
      await this.pool.query('SELECT 1');
      console.log(`Connected to database: ${this.config.database}`);
      
      // Initialize the database schema by running the setup script
      console.log('Initializing database schema...');
      
      const result = spawnSync('npx', ['ts-node', 'scripts/setup-db.ts'], {
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DB_NAME: this.config.database
        },
        stdio: 'inherit'
      });
      
      if (result.status !== 0) {
        throw new Error(`Database schema initialization failed with code ${result.status}`);
      }
      
      console.log('Database schema initialized successfully');
      this.initialized = true;
      
      // Apply standard test migrations
      await this.applyTestMigrations();
      
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Apply standard test migrations 
   * These are migrations that are always needed for tests but might not be
   * part of the production schema
   */
  private async applyTestMigrations(): Promise<void> {
    console.log('Applying standard test migrations...');
    
    // Apply the specific_chain column migration
    await this.applyMigration('add-specific-chain-column', async (client) => {
      // Check if the column exists
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'prices'
          AND column_name = 'specific_chain'
        ) as column_exists;
      `);
      
      // If the column doesn't exist, add it
      if (!result.rows[0].column_exists) {
        console.log('Adding specific_chain column to prices table...');
        
        await client.query(`
          ALTER TABLE prices ADD COLUMN specific_chain VARCHAR(20);
          CREATE INDEX IF NOT EXISTS idx_prices_specific_chain ON prices(specific_chain);
          CREATE INDEX IF NOT EXISTS idx_prices_token_specific_chain ON prices(token, specific_chain);
        `);
        
        console.log('specific_chain column added to prices table');
      } else {
        console.log('specific_chain column already exists in prices table');
      }
    });
  }

  /**
   * Apply a named migration to the database
   * Migrations are only applied once per DbManager instance
   */
  public async applyMigration(name: string, migrationFn: (client: PoolClient) => Promise<void>): Promise<void> {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    
    if (this.migrationApplied.has(name)) {
      console.log(`Migration '${name}' already applied, skipping...`);
      return;
    }

    const client = await this.pool!.connect();
    
    try {
      // Execute the migration within a transaction
      await client.query('BEGIN');
      await migrationFn(client);
      await client.query('COMMIT');
      
      // Mark as applied
      this.migrationApplied.add(name);
      console.log(`Migration '${name}' applied successfully`);
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error(`Failed to apply migration '${name}':`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a database client from the pool
   */
  public getPool(): Pool {
    if (!this.pool || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool;
  }
  
  /**
   * Get a client from the pool for a transaction
   * Make sure to release the client when done
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pool || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.pool.connect();
  }

  /**
   * Reset the database to a clean state
   * - Truncates all tables (except migrations)
   * - Resets sequences
   */
  public async resetDatabase(): Promise<void> {
    if (!this.pool || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    
    const client = await this.pool.connect();
    
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
          console.log(`Truncating tables: ${tables}`);
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
   * Clean up the test database state but keep tables intact
   * This is usually what you want between test runs
   */
  public async cleanupTestState(): Promise<void> {
    if (!this.pool || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    
    const client = await this.pool.connect();
    
    try {
      // Disable foreign key constraints temporarily
      await client.query('SET session_replication_role = replica');
      
      // Truncate specific tables that might contain test data
      await client.query('TRUNCATE teams CASCADE');
      await client.query('TRUNCATE balances CASCADE');
      await client.query('TRUNCATE trades CASCADE');
      await client.query('TRUNCATE competitions CASCADE');
      await client.query('TRUNCATE prices CASCADE');
      
      // Re-enable foreign key constraints
      await client.query('SET session_replication_role = DEFAULT');
      
      console.log('Test state cleaned up');
    } catch (error) {
      console.error('Error cleaning up test state:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection
   * This should be called during teardown
   */
  public async close(): Promise<void> {
    if (this.pool) {
      // Log info about possible connection leaks
      if (this.activeConnections > 0) {
        console.warn(`⚠️ Closing database with ${this.activeConnections} active connections`);
      }
      
      // Close the pool
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
      this.activeConnections = 0;
      this.migrationApplied.clear();
      console.log('Database connection closed');
    }
  }
}

// Export a singleton instance for easy access
export const dbManager = DbManager.getInstance();

// Export helper functions for backward compatibility
export async function initializeDb(): Promise<void> {
  return dbManager.initialize();
}

export function getPool(): Pool {
  return dbManager.getPool();
}

export async function closeDb(): Promise<void> {
  return dbManager.close();
}

export async function resetDb(): Promise<void> {
  return dbManager.resetDatabase();
}

export async function cleanupTestState(): Promise<void> {
  return dbManager.cleanupTestState();
} 