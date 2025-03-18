# Multi-Chain Trading Simulator

A robust server application for hosting simulated blockchain trading competitions where teams can practice trading across multiple chains without risking real assets.

## Project Overview

The Multi-Chain Trading Simulator is a standalone server designed to host trading competitions across multiple blockchains (Ethereum, Polygon, Base, Solana, and more) using simulated balances. Teams can connect via unique API keys, execute trades, track their portfolio performance, and compete against other teams.

### Key Features

- Multi-chain support for both EVM chains (Ethereum, Polygon, Base, etc.) and SVM chains (Solana)
- Team registration with secure API key authentication
- Real-time token price tracking from DexScreener API with support for all major chains (Ethereum, Polygon, Base, Solana, and more)
- Simulated trading with realistic slippage and market conditions
- Balance and portfolio management across multiple chains
- Competition management with leaderboards
- Comprehensive API for trading and account management
- Rate limiting and security features
- **NEW: Chain Override Feature** - Specify the exact chain for EVM tokens to reduce API response times from seconds to milliseconds
- **NEW: Cross-Chain Trading Controls** - Configure whether trades between different chains are allowed or restricted

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
- ✅ Price tracking service with multiple providers and chain support
- ✅ Balance management service with multi-chain capabilities
- ✅ Trade simulation engine
- ✅ Competition management service
- ✅ Chain override feature for high-performance price lookups
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
  - `PriceTracker`: Multi-source price data fetching with chain detection
  - `MultiChainProvider` & `DexScreenerProvider`: Price data for EVM and SVM chains
  - `BalanceManager`: Team balance tracking across multiple chains
  - `TradeSimulator`: Trade execution and processing with chain-specific logic
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
  - `PriceRepository`: Price history storage with chain information

## Technology Stack

- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL 
- **Caching**: In-memory caching with future Redis integration planned
- **API Security**: HMAC authentication for API requests
- **Rate Limiting**: Tiered rate limits based on endpoint sensitivity
- **Price Data**: Integration with DexScreener API for multi-chain price data

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/recallnet/trade-sim
   cd trade-sim
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

## Chain Override Feature

Our new chain override feature significantly improves API response times when fetching token prices on EVM chains. This is the **recommended way** to use the API for price checking:

### What is Chain Override?

For EVM tokens, the system needs to determine which specific chain a token exists on (e.g., Ethereum, Polygon, Base). By default, this requires checking multiple chains sequentially, which can take 1-3 seconds.

With chain override, you can specify the exact chain for a token, resulting in:
- **Without chain override**: 1-3 seconds response time (checking multiple chains)
- **With chain override**: 50-100ms response time (direct API call to specified chain)

That's a 10-20x performance improvement!

### How to Use Chain Override

When making API requests for token prices, include the `specificChain` parameter:

```
GET /api/price?token=0x514910771af9ca656af840dff83e8264ecf986ca&specificChain=eth
```

Or, when using our TypeScript client:

```typescript
// Get price for Chainlink (LINK) token WITH chain override
const linkPrice = await client.getPrice(
  '0x514910771af9ca656af840dff83e8264ecf986ca',    // LINK token
  BlockchainType.EVM,                               // Blockchain type
  SpecificChain.ETH                                 // Specific chain (Ethereum)
);
```

### Supported Chains

The following chains can be specified:
- `eth` - Ethereum Mainnet
- `polygon` - Polygon Network
- `bsc` - Binance Smart Chain
- `arbitrum` - Arbitrum One
- `base` - Base
- `optimism` - Optimism
- `avalanche` - Avalanche C-Chain
- `linea` - Linea
- `svm` - Solana (for SVM tokens)

### Best Practice

For optimal performance, maintain a mapping of tokens to their specific chains in your application:

```typescript
const TOKEN_CHAINS = {
  // EVM tokens with their specific chains
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'eth',    // WETH on Ethereum
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'eth',    // LINK on Ethereum
  '0x912CE59144191C1204E64559FE8253a0e49E6548': 'arbitrum', // ARB on Arbitrum
  '0x532f27101965dd16442E59d40670FaF5eBB142E4': 'base',   // TOSHI on Base
};
```

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

Key configuration options include:
- `EVM_CHAINS`: Comma-separated list of supported EVM chains (defaults to eth,polygon,bsc,arbitrum,base,optimism,avalanche,linea)
- `ALLOW_MOCK_PRICE_HISTORY`: Whether to allow mock price history data generation (defaults to true in development, false in production)
- `ALLOW_CROSS_CHAIN_TRADING`: Whether to allow trades between different chains (defaults to true, set to false to restrict trading to within the same chain only)

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
- `GET /api/account/balances` - Get current balances across all chains
- `GET /api/account/portfolio` - Get portfolio value and composition
- `GET /api/account/trades` - Get trade history

### Trading Operations

The trading simulator provides API endpoints for executing trades and getting quotes:

#### Execute a Trade
```
POST /api/trade/execute
```

Example request body for a cross-chain trade (Solana USDC to Ethereum WETH):
```json
{
  "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
  "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on Ethereum
  "amount": "100.00", // Amount of fromToken to trade
  "fromChain": "svm", // Blockchain type for source token (svm)
  "toChain": "evm", // Blockchain type for destination token (evm) 
  "fromSpecificChain": "svm", // Specific chain for source token (Solana)
  "toSpecificChain": "eth" // Specific chain for destination token (Ethereum)
}
```

**Note**: All pricing is determined automatically by the server based on current market data. The server calculates the appropriate exchange rate for trades based on token prices from its pricing providers.

Cross-chain trading can be disabled via server configuration (`ALLOW_CROSS_CHAIN_TRADING=false`). When disabled, the server will validate that both tokens are on the same blockchain and reject trades that attempt to trade between different chains.

### Price Information
- `GET /api/price` - Get current price for a token across chains (supports chain override)
- `GET /api/price/token-info` - Get detailed token information including specific chain (supports chain override)
- `GET /api/price/provider` - Get price from a specific provider (supports chain override)
- `GET /api/price/history` - Get price history with timeframe configuration

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
import { TradingSimulatorClient, BlockchainType, SpecificChain } from './api-client';

const client = new TradingSimulatorClient(
  'your-api-key',
  'your-api-secret'
);

// Get account balances
const balances = await client.getBalances();
console.log('Balances:', balances);

// Get current price of SOL on Solana
const solPrice = await client.getPrice('So11111111111111111111111111111111111111112');
console.log('SOL Price:', solPrice);

// Get current price of WETH on Ethereum (WITHOUT chain override - slower)
const ethPrice = await client.getPrice('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
console.log('ETH Price:', ethPrice);

// Get current price of LINK on Ethereum (WITH chain override - faster)
const linkPrice = await client.getPrice(
  '0x514910771af9ca656af840dff83e8264ecf986ca',    // LINK token
  BlockchainType.EVM,                               // Blockchain type
  SpecificChain.ETH                                 // Specific chain (Ethereum)
);
console.log('LINK Price (with chain override):', linkPrice);
console.log('Response time: ~50-100ms (vs 1-3 seconds without override)');

// Get current price of ARB on Arbitrum (WITH chain override - faster)
const arbPrice = await client.getPrice(
  '0x912CE59144191C1204E64559FE8253a0e49E6548',    // ARB token
  BlockchainType.EVM,
  SpecificChain.ARBITRUM                           // Specific chain (Arbitrum)
);
console.log('ARB Price (with chain override):', arbPrice);
```

### Performance Comparison

Using chain override can significantly improve API response times:

| Method | Response Time | Notes |
|--------|---------------|-------|
| Without chain override | 1-3 seconds | System checks multiple chains sequentially |
| With chain override | 50-100ms | Direct API call to specified chain |
| Performance improvement | 10-20x faster | Recommended for production use |

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

For advanced examples including chain override performance testing:
   ```bash
   npx ts-node multi-chain-examples.ts
   ```

For more information, see the [examples README](docs/examples/README.md).

## Next Steps

The following features are planned for upcoming development:

1. Add support for more EVM chains (zkSync, Scroll, Mantle, etc.)
2. Complete comprehensive test suite
3. Enhance error handling and logging
4. Implement scheduled tasks for portfolio snapshots
5. Add more advanced analytics for team performance
6. Integrate with a front-end application for visualization
7. Add user notifications for significant events
8. Implement Redis for improved caching and performance

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

## Portfolio Snapshots

The system automatically takes snapshots of team portfolios at regular intervals for performance tracking. The snapshot interval is configurable via environment variables:

```
# Configure portfolio snapshot interval in milliseconds (default: 2 minutes)
PORTFOLIO_SNAPSHOT_INTERVAL_MS=120000
```

You can adjust this interval based on your needs:
- For testing environments, you may want to use a shorter interval (e.g., 10000ms = 10 seconds)
- For production environments, you might want to use a longer interval to reduce database load (e.g., 300000ms = 5 minutes)

Portfolio snapshots are taken:
1. When a competition starts
2. At regular intervals throughout the competition (controlled by the environment variable)
3. When a competition ends

Snapshot data is available via the admin API endpoint:
```
GET /api/admin/competition/:competitionId/snapshots
```

## Cross-Chain Trading Configuration

The trading simulator supports two modes of operation for cross-chain trading:

### Allowed Cross-Chain Trading (Default)

With `ALLOW_CROSS_CHAIN_TRADING=true` (default setting), users can:
- Trade between tokens on different blockchain types (e.g., Solana SOL to Ethereum ETH)
- Execute trades between any supported chains (e.g., Polygon MATIC to Base ETH)
- Maintain a diversified portfolio across multiple blockchains

This mode is ideal for:
- Multi-chain trading competitions
- Teaching cross-chain trading strategies
- Simulating real-world DeFi trading environments where bridges enable cross-chain transfers

### Restricted Same-Chain Trading

With `ALLOW_CROSS_CHAIN_TRADING=false`, the system will:
- Reject trades where the source and destination tokens are on different chains
- Return an error message indicating that cross-chain trading is disabled
- Only allow trades between tokens on the same blockchain

This mode is useful for:
- Chain-specific trading competitions
- Simulating environments without cross-chain bridges
- Focusing participants on chain-specific trading strategies

### Implementation

Configure this option in your `.env` file:

```
# Set to false to disable trades between different chains
ALLOW_CROSS_CHAIN_TRADING=true
```

When disabled, the trade validation in the `TradeSimulator` service will verify that both tokens are on the same chain before proceeding with the trade execution.

### Using Chain Parameters with Trade Restrictions

When executing trades with explicit chain parameters, the system's behavior will depend on the `ALLOW_CROSS_CHAIN_TRADING` setting:

#### With Cross-Chain Trading Allowed (`ALLOW_CROSS_CHAIN_TRADING=true`):
```javascript
// This cross-chain trade will be accepted
{
  "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
  "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",    // WETH on Ethereum
  "amount": "50",
  "fromChain": "svm",
  "toChain": "evm",
  "fromSpecificChain": "svm",
  "toSpecificChain": "eth"
}
```

#### With Cross-Chain Trading Disabled (`ALLOW_CROSS_CHAIN_TRADING=false`):
```javascript
// This cross-chain trade will be REJECTED with an error
{
  "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
  "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",    // WETH on Ethereum
  "amount": "50",
  "fromChain": "svm",
  "toChain": "evm"  // Different from fromChain, will be rejected
}

// This same-chain trade will be ACCEPTED
{
  "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
  "toToken": "So11111111111111111111111111111111111111112",    // SOL on Solana
  "amount": "50",
  "fromChain": "svm",
  "toChain": "svm"  // Same as fromChain, will be accepted
}
```

This approach allows you to control whether trades can cross between different blockchains, while still using explicit chain parameters to avoid chain detection overhead. 