import { config } from 'dotenv';
import { resolve } from 'path';
import { cleanupDatabase, initializeDatabase } from './database';
import { startServer, stopServer } from './server';

// Load environment variables from .env.test file
config({ path: resolve(__dirname, '../../.env.test') });

// Global setup before all tests
beforeAll(async () => {
  // Log the start of E2E tests
  console.log('🚀 Starting E2E tests...');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Initialize the test database
  await initializeDatabase();
  
  // Start the server
  await startServer();
  
  // Wait a bit to ensure server is fully started
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Global teardown after all tests
afterAll(async () => {
  // Stop the server
  await stopServer();
  
  // Optional: Clean up database after tests
  if (process.env.E2E_CLEANUP_DB === 'true') {
    await cleanupDatabase();
  }
  
  console.log('✅ E2E tests completed');
}); 