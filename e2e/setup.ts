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

// Store global server reference
let server: Server;

// Setup function to run before all tests
export async function setup() {
  // Load test environment variables
  config({ path: path.resolve(__dirname, '../.env.test') });
  
  // Ensure TEST_MODE is set
  process.env.TEST_MODE = 'true';
  
  console.log('🚀 Setting up E2E test environment...');
  
  try {
    // Kill any existing server processes that might be hanging
    await killExistingServers();
    
    // Initialize database
    console.log('📦 Initializing database...');
    await initializeDb();
    
    // Start server
    console.log('🌐 Starting server...');
    server = await startServer();
    
    console.log('✅ Test environment ready');
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    throw error;
  }
}

// Teardown function to run after all tests
export async function teardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clear all scheduler timers first
    console.log('🕒 Clearing all scheduler timers...');
    SchedulerService.clearAllTimers();
    
    // Stop server
    if (server) {
      console.log('🛑 Stopping server...');
      await stopServer(server);
    }
    
    // As a safety measure, kill any remaining server processes
    await killExistingServers();
    
    // Close database connection
    console.log('🔌 Closing database connection...');
    await closeDb();
    
    console.log('✅ Test environment cleaned up');
  } catch (error) {
    console.error('❌ Failed to clean up test environment:', error);
    
    // As a last resort, try to kill any server processes
    try {
      await killExistingServers();
    } catch (secondError) {
      console.error('Failed to kill server processes as a last resort:', secondError);
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