/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  rootDir: './',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts'],
  globalSetup: '<rootDir>/setup.ts',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  maxConcurrency: 1, // Run tests sequentially
  verbose: true,
  forceExit: true, // Force Jest to exit after all tests are complete
  detectOpenHandles: true, // Identify open handles preventing Jest from exiting
}; 