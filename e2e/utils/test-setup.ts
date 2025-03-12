/**
 * Test setup file that runs before each test suite
 * 
 * This is used to set up global Jest configurations and hooks
 */

import { cleanupTestState } from './test-helpers';
import { services } from '../../src/services';

// Extend the timeout for all tests
jest.setTimeout(30000);

// Global Jest setup for E2E tests

// Set test mode environment variable
process.env.TEST_MODE = 'true';

// Before all tests in every file
beforeAll(async () => {
  console.log('[Global Setup] Initializing test environment...');
  
  // Ensure scheduler is reset at the start of tests
  if (services.scheduler) {
    console.log('[Global Setup] Resetting scheduler service...');
    services.scheduler.reset();
  }
});

// Before each test
beforeEach(async () => {
  // Reset scheduler to ensure a clean state for each test
  if (services.scheduler) {
    console.log('[Global Setup] Resetting scheduler service for new test...');
    services.scheduler.reset();
  }
});

// After all tests in every file
afterAll(async () => {
  console.log('[Global Teardown] Cleaning up test environment...');
  
  try {
    // Stop the scheduler to prevent ongoing database connections
    if (services.scheduler) {
      console.log('[Global Teardown] Stopping scheduler service...');
      services.scheduler.stopSnapshotScheduler();
      console.log('[Global Teardown] Scheduler service stopped');
    }
    
    // Add a small delay to allow any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clean up database state
    await cleanupTestState();
    
  } catch (error) {
    console.error('[Global Teardown] Error during cleanup:', error);
  }
});

// Log test lifecycle events for debugging
beforeEach(() => {
  console.log(`[Test] Starting test: ${expect.getState().currentTestName}`);
});

afterEach(() => {
  console.log(`[Test] Completed test: ${expect.getState().currentTestName}`);
  jest.resetAllMocks();
}); 