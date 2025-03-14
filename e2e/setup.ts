/**
 * Setup script for end-to-end tests
 * 
 * This file is automatically run by Jest before all tests
 */

import { config } from 'dotenv';
import path from 'path';
import { Server } from 'http';
import { initializeDb, closeDb } from './utils/database';
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
  config({ path: path.resolve(__dirname, '../.env.test') });
  
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
    
    // Initialize database
    log('📦 Initializing database...');
    await initializeDb();
    
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
    
    // Close database connection
    log('🔌 Closing database connection...');
    await closeDb();
    
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
  // Don't use globalThis.afterAll as it's not available in this context
  return async () => {
    await teardown();
  };
} 