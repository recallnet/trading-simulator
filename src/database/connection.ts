import { Pool, PoolClient } from 'pg';
import { config } from '../config';

/**
 * Database Connection Manager
 * Handles PostgreSQL connection pool and transactions
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      user: config.database.username,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a connection to become available
    });

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    console.log(`[DatabaseConnection] Connected to PostgreSQL at ${config.database.host}:${config.database.port}`);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Get a client from the pool
   */
  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a query using the pool
   * @param text Query text
   * @param params Query parameters
   */
  public async query(text: string, params: any[] = []): Promise<any> {
    try {
      const res = await this.pool.query(text, params);
      return res;
    } catch (err) {
      console.error(`[DatabaseConnection] Error executing query: ${text}`, err);
      throw err;
    }
  }

  /**
   * Execute a transaction
   * @param callback Function to execute within the transaction
   */
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Close the pool
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
} 