/**
 * Test setup file that runs before each test suite
 * 
 * This is used to set up global Jest configurations and hooks
 */

import { cleanupTestState } from './test-helpers';

// Extend the timeout for all tests
jest.setTimeout(30000);

// Clean up after each test suite
afterAll(async () => {
  await cleanupTestState();
});

// Reset mocks after each test
afterEach(() => {
  jest.resetAllMocks();
}); 