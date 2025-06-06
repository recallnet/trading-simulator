# Database Manager for E2E Tests

This document explains how to use the new `DbManager` for database operations in E2E tests.

## Overview

The `DbManager` is a singleton utility that provides a standardized way to manage database connections, schema, and state for end-to-end tests. It addresses several issues with the previous approach:

- Ensures a single connection pool is shared across all tests
- Tracks connections to prevent leaks
- Provides proper initialization and teardown
- Ensures consistent cleanup between tests

## Basic Usage

```typescript
import { dbManager } from '../utils/db-manager';

describe('My Test Suite', () => {
  beforeAll(async () => {
    // Initialize the database before all tests
    await dbManager.initialize();
  });

  beforeEach(async () => {
    // Clean up state between tests
    await dbManager.cleanupTestState();
  });

  afterAll(async () => {
    // Close all connections after tests
    await dbManager.close();
  });

  it('should perform a database operation', async () => {
    // Get the pool when you need to run queries
    const pool = dbManager.getPool();
    const result = await pool.query('SELECT * FROM my_table');
    expect(result.rows).toHaveLength(0);
  });
});
```

## API Reference

### Initialization

```typescript
// Initialize the database (creates it if it doesn't exist)
await dbManager.initialize();
```

### Running Queries

```typescript
// Get the pool for simple queries
const pool = dbManager.getPool();
const result = await pool.query('SELECT * FROM my_table');

// Get a client for transactions
const client = await dbManager.getClient();
try {
  await client.query('BEGIN');
  // ... perform transaction operations
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release(); // IMPORTANT: Always release the client
}
```

### Test State Management

```typescript
// Reset the entire database (truncates all tables)
await dbManager.resetDatabase();

// Clean up just the test-related tables
await dbManager.cleanupTestState();
```

### Cleanup

```typescript
// Close all connections when done
await dbManager.close();
```

## Best Practices

1. **Always initialize before using**: Call `dbManager.initialize()` in your `beforeAll` hook
2. **Clean up between tests**: Call `dbManager.cleanupTestState()` in your `beforeEach` hook
3. **Close when done**: Call `dbManager.close()` in your `afterAll` hook
4. **Use transactions**: For multi-step operations, use transactions to maintain data consistency
5. **Release clients**: Always release clients when using `getClient()`

## Legacy Support

The `db-manager.ts` file also exports helper functions for backward compatibility:

```typescript
// Old API functions (backed by DbManager)
import { initializeDb, getPool, closeDb, resetDb, cleanupTestState } from '../utils/db-manager';
```
