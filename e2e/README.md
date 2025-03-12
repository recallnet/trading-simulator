# End-to-End (E2E) Tests for Solana Trading Simulator

This directory contains the end-to-end testing suite for the Solana Trading Simulator. The tests cover the entire application stack from server startup to database interactions and API endpoints.

## Architecture

The E2E testing framework is structured as follows:

```
e2e/
├── jest.config.js         # Jest configuration for E2E tests
├── setup.ts               # Global setup for all tests (runs once)
├── tsconfig.json          # TypeScript configuration for tests
├── tests/                 # Test files
│   ├── admin.test.ts      # Admin functionality tests
│   ├── competition.test.ts # Competition management tests
│   ├── team.test.ts       # Team registration and management tests
│   └── trading.test.ts    # Trading functionality tests
└── utils/                 # Utility functions for tests
    ├── api-client.ts      # API client for making requests
    ├── database.ts        # Database utilities
    ├── server.ts          # Server startup/shutdown utilities
    ├── test-helpers.ts    # Common test helper functions
    └── test-setup.ts      # Setup that runs before each test
```

## Environment Setup

The tests use their own environment variables defined in `.env.test` at the project root. This ensures tests run against a separate database and server configuration from development or production.

## Running Tests

To run the E2E tests:

```bash
npm run test:e2e
```

To run tests in watch mode during development:

```bash
npm run test:e2e:watch
```

## Test Flow

Each test follows a similar pattern:
1. Setup test environment (database, server)
2. Create necessary test data (admin account, teams, competition)
3. Execute the functionality being tested
4. Verify the expected outcomes
5. Clean up test state

## Adding New Tests

When adding new tests:
1. Create a new file in the `tests/` directory
2. Import necessary utilities from the `utils/` directory
3. Structure your tests using Jest's `describe` and `test` functions
4. Clean up any resources created during your tests

## Debugging

For debugging tests, you can:
- Increase the log level in `.env.test`
- Add `console.log` statements
- Use the `await wait(ms)` helper function to pause execution during debugging 