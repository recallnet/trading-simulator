/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000, // 60 seconds timeout for tests to prevent premature failures
  rootDir: './',
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts'],
  globalSetup: '<rootDir>/setup.ts',
  globalTeardown: '<rootDir>/teardown.ts',
  maxConcurrency: 1, // Run tests serially to avoid conflicts
  maxWorkers: 1,     // Use only one worker for test execution
  verbose: true,
  forceExit: true,   // Force exit after all tests complete
  detectOpenHandles: true,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  reporters: ['default', '<rootDir>/utils/log-reporter.js'], // Add custom reporter
}; 