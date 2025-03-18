/**
 * Setup script for end-to-end tests
 * 
 * This file is automatically run by Jest before all tests.
 * It initializes the test environment, including the database and server.
 */

import { config } from 'dotenv';
import path from 'path';
import { Server } from 'http';
import { dbManager } from './utils/db-manager';
import { startServer, stopServer, killExistingServers } from './utils/server';
import { SchedulerService } from '../src/services/scheduler.service';
import fs from 'fs';

// Store global server reference
let server: Server;

// Path to log file
const logFile = path.resolve(__dirname, 'e2e-server.log');
const fullSuiteFlag = path.resolve(__dirname, '.full-suite-running');

// Function to log to both console and file
const log = (message: string) => {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
};

// Setup function to run before all tests
export async function setup() {
  // Load test environment variables
  const envTestPath = path.resolve(__dirname, '../.env.test');
  const envTestExists = fs.existsSync(envTestPath);

  // Log important environment loading information
  console.log('========== E2E TEST ENVIRONMENT SETUP ==========');
  console.log(`Looking for .env.test at: ${envTestPath}`);
  console.log(`.env.test file exists: ${envTestExists}`);

  if (envTestExists) {
    // Save original values for debugging
    const originalBaseUsdcBalance = process.env.INITIAL_BASE_USDC_BALANCE;
    
    // Force override with .env.test values
    const result = config({ path: envTestPath, override: true });
    
    console.log(`Loaded .env.test file: ${result.parsed ? 'successfully' : 'failed'}`);
    if (result.parsed) {
      console.log(`Loaded ${Object.keys(result.parsed).length} variables from .env.test`);
      
      // Check specific test-critical variables
      console.log('Critical variables after loading .env.test:');
      console.log(`- INITIAL_BASE_USDC_BALANCE: ${process.env.INITIAL_BASE_USDC_BALANCE} (was: ${originalBaseUsdcBalance})`);
      console.log(`- ALLOW_CROSS_CHAIN_TRADING: ${process.env.ALLOW_CROSS_CHAIN_TRADING}`);
    }
  } else {
    console.warn('⚠️ WARNING: .env.test file not found! Tests will use .env or default values.');
    
    // Try loading from .env as fallback and log the result
    const envMainPath = path.resolve(__dirname, '../.env');
    const envMainExists = fs.existsSync(envMainPath);
    console.log(`Using .env as fallback. File exists: ${envMainExists}`);
    
    if (envMainExists) {
      const result = config({ path: envMainPath, override: true });
      console.log(`Loaded .env file: ${result.parsed ? 'successfully' : 'failed'}`);
    }
  }

  // Ensure TEST_MODE is set
  process.env.TEST_MODE = 'true';
  
  // Check if this is an individual test run (not part of the full suite)
  // If so, clear the log file first
  if (!fs.existsSync(fullSuiteFlag)) {
    fs.writeFileSync(logFile, '');
  }
  
  log('🚀 Setting up E2E test environment...');
  
  try {
    // Kill any existing server processes that might be hanging
    await killExistingServers();
    
    // Initialize database using our new DbManager
    log('📦 Initializing database...');
    await dbManager.initialize();
    
    // Start server
    log('🌐 Starting server...');
    server = await startServer();
    
    log('✅ Test environment ready');
  } catch (error) {
    log('❌ Failed to set up test environment: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

// Teardown function to run after all tests
export async function teardown() {
  log('🧹 Cleaning up test environment...');
  
  try {
    // Clear all scheduler timers first
    log('🕒 Clearing all scheduler timers...');
    SchedulerService.clearAllTimers();
    
    // Stop server
    if (server) {
      log('🛑 Stopping server...');
      await stopServer(server);
    }
    
    // As a safety measure, kill any remaining server processes
    await killExistingServers();
    
    // Close database connection using our DbManager
    log('🔌 Closing database connection...');
    await dbManager.close();
    
    // Clean up the full suite flag if it exists
    if (fs.existsSync(fullSuiteFlag)) {
      fs.unlinkSync(fullSuiteFlag);
    }
    
    log('✅ Test environment cleaned up');
  } catch (error) {
    log('❌ Failed to clean up test environment: ' + (error instanceof Error ? error.message : String(error)));
    
    // As a last resort, try to kill any server processes
    try {
      await killExistingServers();
    } catch (secondError) {
      log('Failed to kill server processes as a last resort: ' + String(secondError));
    }
    
    throw error;
  }
}

// Setup and teardown for Jest Global Setup
export default async function() {
  await setup();
  
  // Register the teardown to be handled by Jest itself
  return async () => {
    await teardown();
  };
} 