#!/usr/bin/env node

/**
 * Script to run end-to-end tests
 * 
 * This script handles:
 * 1. Setting up the test environment
 * 2. Running Jest tests
 * 3. Cleaning up afterward
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { config } from 'dotenv';

// Load test environment variables
config({ path: path.resolve(__dirname, '../.env.test') });

console.log('🚀 Solana Trading Simulator E2E Test Runner');
console.log('===========================================');

try {
  // Ensure test database exists and is set up
  console.log('\n📦 Setting up test database...');
  const dbSetupResult = spawnSync('npx', ['ts-node', 'scripts/setup-db.ts'], {
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  if (dbSetupResult.status !== 0) {
    throw new Error('Database setup failed');
  }

  // Run Jest tests
  console.log('\n🧪 Running E2E tests...');
  const jestResult = spawnSync('npx', ['jest', '-c', 'e2e/jest.config.js', ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  if (jestResult.status !== 0) {
    process.exit(jestResult.status || 1);
  }

  console.log('\n✅ E2E tests completed successfully');
} catch (error) {
  console.error('\n❌ E2E test run failed:', error);
  process.exit(1);
} 