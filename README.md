# Solana Trading Simulator

A robust server application for hosting simulated Solana blockchain trading competitions where teams can practice trading without risking real assets.

## Project Overview

The Solana Trading Simulator is a standalone server designed to host trading competitions on the Solana blockchain using simulated balances. Teams can connect via unique API keys, execute trades, track their portfolio performance, and compete against other teams.

### Key Features

- Team registration with secure API key authentication
- Real-time token price tracking from multiple sources (Jupiter, Raydium, Solana)
- Simulated trading with realistic slippage and market conditions
- Balance and portfolio management
- Competition management with leaderboards
- Comprehensive API for trading and account management
- Rate limiting and security features

## Current Development Status

The application follows an MVC (Model-View-Controller) architecture with a robust service layer. Here's the current development status:

- ✅ Core architecture and project structure implementation
- ✅ Database persistence layer with PostgreSQL
- ✅ Repository pattern for data access
- ✅ Service layer for business logic
- ✅ Controller layer for handling API requests
- ✅ Authentication middleware with API key validation
- ✅ Rate limiting middleware
- ✅ Route definitions for all API endpoints
- ✅ Price tracking service with multiple providers
- ✅ Balance management service
- ✅ Trade simulation engine
- ✅ Competition management service
- ⏳ Comprehensive testing (in progress)
- ⏳ Documentation (in progress)
- ⏳ Integration with front-end (planned)

## Technical Architecture

The application uses a layered architecture:

```
┌─────────────────┐
│   Controllers   │ ◄── HTTP Request/Response handling
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Services     │ ◄── Business logic implementation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Repositories   │ ◄── Data access layer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │ ◄── PostgreSQL persistence
└─────────────────┘
```

### Key Components

- **Services**: Core business logic implementation
  - `PriceTracker`: Multi-source price data fetching
  - `BalanceManager`: Team balance tracking
  - `TradeSimulator`: Trade execution and processing
  - `CompetitionManager`: Competition lifecycle management
  - `TeamManager`: Team registration and authentication

- **Controllers**: API endpoint handlers
  - `AccountController`: Balance and portfolio information
  - `AdminController`: Admin operations for competition management
  - `AuthController`: Authentication operations
  - `CompetitionController`: Competition status and leaderboards
  - `PriceController`: Price information access
  - `TradeController`: Trade execution and quotes

- **Repositories**: Data access layer
  - `TeamRepository`: Team data management
  - `BalanceRepository`: Balance record management
  - `TradeRepository`: Trade history management
  - `CompetitionRepository`: Competition data management
  - `PriceRepository`: Price history storage

## Technology Stack

- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL 
- **Caching**: In-memory caching with future Redis integration planned
- **API Security**: HMAC authentication for API requests
- **Rate Limiting**: Tiered rate limits based on endpoint sensitivity

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/recallnet/trading-sim
   cd trading-sim
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the environment and database (automated setup):
   ```
   npm run setup
   ```
   This command:
   - Generates secure random values for JWT_SECRET, API_KEY_SECRET, and HMAC_SECRET
   - Creates or updates the .env file with these values
   - Initializes the database schema with all necessary tables
   - Applies all required migrations automatically

   Alternatively, you can run the steps separately:
   ```
   npm run generate:secrets  # Generate security secrets
   npm run db:init           # Initialize the database with full schema
   ```

4. Start the development server:
   ```
   npm run dev
   ```

The server will be available at http://localhost:3000 by default.

## Admin Setup Guide

As the administrator of this application, you'll need to properly configure the system before teams can use it. This guide covers how to set up the system quickly and efficiently.

### Quick Setup (Recommended)

For a seamless setup experience, we've created a single command that handles everything for you:

```bash
npm run setup:all
```

This command will:
1. Generate all required security secrets
2. Initialize the database
3. Run all database migrations
4. Build the application
5. Start the server temporarily
6. Set up the admin account (with a prompt for credentials)
7. Provide final instructions

This is the easiest way to get the system up and running with minimal effort.

### Manual Setup 

If you prefer to set up each component separately, you can follow these steps:

#### 1. Environment Configuration

The application uses environment variables for configuration. Create a `.env` file in the root directory based on `.env.example`.

#### 2. Security Secret Generation

Generate all required security secrets with:

```bash
npm run generate:secrets
```

This will create the following secrets:
- `JWT_SECRET`: Used for admin authentication
- `API_KEY_SECRET`: Used for team API key generation
- `HMAC_SECRET`: Used for request signing
- `MASTER_ENCRYPTION_KEY`: Used for encrypting API secrets

#### 3. Database Initialization

Initialize the database with:

```bash
npm run db:init
```

#### 4. Run Migrations

Apply all database migrations:

```bash
npm run db:migrate
```

#### 5. Build the Application

Build the TypeScript application:

```bash
npm run build
```

#### 6. Start the Server

Start the server:

```bash
npm run start
```

#### 7. Set Up Admin Account

In a separate terminal, set up the admin account:

```bash
npm run setup:admin
```

This will prompt you to enter admin credentials or will generate them for you.

### Starting the Server

After completing the setup, start the server with:

```bash
npm run start
```

For development with hot reloading:

```bash
npm run dev
```

The server will be available at http://localhost:3000 by default.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with API key and secret
- `POST /api/auth/validate` - Validate API credentials

### Account Management
- `GET /api/account/balances` - Get current balances
- `GET /api/account/portfolio` - Get portfolio value and composition
- `GET /api/account/trades` - Get trade history

### Trading Operations
- `POST /api/trade/execute` - Execute a trade
- `GET /api/trade/quote` - Get quote for a potential trade

### Price Information
- `GET /api/price/current` - Get current price for a token
- `GET /api/price/history` - Get price history

### Competition Information
- `GET /api/competition/leaderboard` - Get competition leaderboard
- `GET /api/competition/status` - Get current competition status
- `GET /api/competition/rules` - Get competition rules

### Admin Operations
- `POST /api/admin/teams/register` - Register a new team
- `POST /api/admin/competition/start` - Start a new competition
- `POST /api/admin/competition/end` - End the current competition
- `GET /api/admin/reports/performance` - Get performance reports

## Security

All protected API endpoints require:
- API Key in request header (`X-API-Key`)
- Request timestamp in header (`X-Timestamp`)
- HMAC signature in header (`X-Signature`)

Signature calculation:
```
Signature = HMAC-SHA256(requestMethod + path + timestamp + requestBody, apiSecret)
```

### API Secret Encryption

For enhanced security, API secrets are stored using a dual approach:
- A bcrypt hash of the API secret for authentication
- An AES-256-CBC encrypted version of the raw API secret for HMAC signature validation

This approach ensures:
1. The original API secret is never stored in plaintext in the database
2. The server can still validate HMAC signatures without compromising security
3. Even if database contents are exposed, the API secrets remain protected

The encryption uses:
- AES-256-CBC encryption algorithm
- A unique initialization vector (IV) for each encrypted secret
- A master encryption key from environment variables (`MASTER_ENCRYPTION_KEY`)

For production deployments, it's recommended to:
- Use a hardware security module (HSM) or key management service (KMS) for the master encryption key
- Rotate the master encryption key periodically
- Implement proper key management procedures

### Rate Limiting

The application implements tiered rate limiting:
- 100 requests per minute for trade operations
- 300 requests per minute for price queries
- 30 requests per minute for balance/portfolio checks
- 3,000 requests per minute across all endpoints
- 10,000 requests per hour per team

These values can be customized in the `.env` file.

## API Documentation

For teams participating in trading competitions, we provide comprehensive API documentation and code examples to help you get started quickly.

### Documentation Resources

- **[API Documentation](docs/API_DOCUMENTATION.md)**: Detailed documentation of all API endpoints, authentication requirements, and response formats.
- **[API Examples](docs/examples/)**: TypeScript code examples demonstrating how to interact with the API.
- **[Postman Guide](docs/POSTMAN_GUIDE.md)**: Step-by-step instructions for setting up and using Postman with the Trading Simulator API.

### Authentication

All API requests require HMAC authentication with the following headers:

- `X-API-Key`: Your team's API key
- `X-Timestamp`: Current timestamp in ISO format
- `X-Signature`: HMAC-SHA256 signature
- `Content-Type`: `application/json`

For details on generating the signature and examples in TypeScript, see the [API Documentation](docs/API_DOCUMENTATION.md).

### Example Client

We provide a [TypeScript client class](docs/examples/api-client.ts) that handles authentication and requests for you. Usage example:

```typescript
import { TradingSimulatorClient } from './api-client';

const client = new TradingSimulatorClient(
  'your-api-key',
  'your-api-secret'
);

// Get account balances
const balances = await client.getBalances();
console.log('Balances:', balances);
```

### Running the Examples

To run the provided examples:

1. Install dependencies:
   ```bash
   cd docs/examples
   npm install typescript ts-node @types/node
   ```

2. Update the examples with your team's API credentials.

3. Run an example:
   ```bash
   npx ts-node get-balances-example.ts
   ```

For more information, see the [examples README](docs/examples/README.md).

## Next Steps

The following features are planned for upcoming development:

1. Complete comprehensive test suite
2. Enhance error handling and logging
3. Implement scheduled tasks for portfolio snapshots
4. Add more advanced analytics for team performance
5. Integrate with a front-end application for visualization
6. Add user notifications for significant events
7. Implement Redis for improved caching and performance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Testing

### Unit Tests

Run the unit tests with:

```bash
npm test
```

### End-to-End Tests

The project includes comprehensive end-to-end tests that verify the entire application stack from server startup to database operations and API endpoints.

To run the E2E tests:

```bash
npm run test:e2e
```

For a more comprehensive test run with database setup:

```bash
npm run test:e2e:runner
```

For more information on the E2E testing architecture, see the [E2E test documentation](./e2e/README.md). 