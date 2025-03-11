import * as readline from 'readline';
import { Pool } from 'pg';
import { config } from '../src/config';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment is loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Database Cleanup Script for Development
 * WARNING: This script will delete all data in your tables. Use only in development.
 */

const createInterface = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  reset: '\x1b[0m'
};

const cleanDatabase = async () => {
  // Check if we're in development mode
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'development') {
    console.error(`${colors.red}ERROR: This script can only be run in development mode.${colors.reset}`);
    console.error(`Current NODE_ENV: ${nodeEnv}`);
    console.error(`Set NODE_ENV=development to run this script.`);
    process.exit(1);
  }

  console.log(`${colors.yellow}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.yellow}║                   DATABASE CLEANUP SCRIPT                      ║${colors.reset}`);
  console.log(`${colors.yellow}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.yellow}║ WARNING: This will DELETE ALL DATA from your database tables:  ║${colors.reset}`);
  console.log(`${colors.yellow}║ - Host: ${config.database.host}                               ${colors.reset}`);
  console.log(`${colors.yellow}║ - Database: ${config.database.database}                        ${colors.reset}`);
  console.log(`${colors.yellow}║                                                                ║${colors.reset}`);
  console.log(`${colors.yellow}║ ALL TABLE DATA WILL BE PERMANENTLY LOST!                       ║${colors.reset}`);
  console.log(`${colors.yellow}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  const rl = createInterface();
  
  return new Promise<void>((resolve, reject) => {
    rl.question(`${colors.red}Type "DELETE" to confirm: ${colors.reset}`, async (answer) => {
      rl.close();
      
      if (answer.trim() !== 'DELETE') {
        console.log('Operation cancelled.');
        resolve();
        return;
      }
      
      try {
        // Connect to the target database directly
        const connectionConfig = {
          user: config.database.username,
          password: config.database.password,
          host: config.database.host,
          port: config.database.port,
          database: config.database.database
        };
        
        console.log(`\nConnecting to database: ${config.database.database}...`);
        const pool = new Pool(connectionConfig);
        
        // Begin transaction
        await pool.query('BEGIN');
        
        try {
          // Disable foreign key constraints temporarily
          console.log('\nDisabling foreign key constraints...');
          await pool.query('SET CONSTRAINTS ALL DEFERRED');
          
          // Get a list of all tables in our database
          console.log('\nGetting list of tables...');
          const tablesResult = await pool.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
          `);
          
          const tables = tablesResult.rows.map(row => row.tablename);
          
          if (tables.length === 0) {
            console.log(`\n${colors.yellow}No tables found in database.${colors.reset}`);
          } else {
            // Delete data from all tables (in reverse dependency order)
            console.log('\nDeleting data from tables...');
            
            // List of tables in dependency order (reverse of creation order)
            const orderedTables = [
              // First delete tables with foreign key dependencies
              'portfolio_token_values',
              'portfolio_snapshots',
              'trades',
              'balances',
              'competition_teams',
              'competitions',
              'prices',
              'teams'
            ];
            
            // Delete from ordered tables first if they exist
            for (const table of orderedTables) {
              if (tables.includes(table)) {
                console.log(`  - Truncating table: ${table}`);
                await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
              }
            }
            
            // Get sequences and reset them
            console.log('\nResetting sequences...');
            const sequencesResult = await pool.query(`
              SELECT sequence_name FROM information_schema.sequences
              WHERE sequence_schema = 'public'
            `);
            
            for (const row of sequencesResult.rows) {
              const sequenceName = row.sequence_name;
              console.log(`  - Resetting sequence: ${sequenceName}`);
              await pool.query(`ALTER SEQUENCE ${sequenceName} RESTART WITH 1`);
            }
          }
          
          // Commit transaction
          await pool.query('COMMIT');
          console.log(`\n${colors.green}✓ All table data has been successfully deleted${colors.reset}`);
          
        } catch (error) {
          // Rollback on error
          await pool.query('ROLLBACK');
          throw error;
        } finally {
          // Re-enable foreign key constraints
          await pool.query('SET CONSTRAINTS ALL IMMEDIATE');
        }
        
        // Close the connection
        await pool.end();
        console.log(`\n${colors.green}✓ Database cleanup completed successfully!${colors.reset}`);
        console.log(`\nYou can now run 'npm run db:init' to re-initialize the schema and seed data.`);
        
        resolve();
      } catch (error) {
        console.error(`\n${colors.red}Error cleaning database:${colors.reset}`, error);
        reject(error);
      }
    });
  });
};

// Run the script if called directly
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('Database cleanup failed:', err);
      process.exit(1);
    });
}

export { cleanDatabase }; 