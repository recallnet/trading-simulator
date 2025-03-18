# Multi-Chain Trading Simulator Server - Technical Specification

## 1. Introduction

This document outlines the technical specifications for a standalone Solana Trading Simulator Server designed to host a competition that involves simulated trading. The server will allow multiple teams to connect via unique API keys, submit trade requests, and keep track of individual team performances.

## 2. Project Overview

### 2.1 Purpose

The Solana Trading Simulator Server will provide a controlled environment for teams to practice and compete in simulated trading on the Solana blockchain without risking real assets. This will allow participants to:

- Execute trades using virtual balances
- Track performance over time
- Compare results with other participants
- Learn about Solana token trading in a safe environment

### 2.2 Key Features

- Team registration and API key management
- Token price simulation using real market data
- Trade execution with configurable parameters
- Balance and portfolio tracking
- Performance analytics and leaderboards
- Administrative dashboard for competition management

### 2.3 Reference Implementation

A reference implementation of the core trading functionality can be found in the `plugin-simulator-solana-example` directory. This implementation was originally created as a plugin for a separate application and should be used as guidance rather than directly integrated.

#### 2.3.1 Reference Architecture

The example implementation includes:

- **Price Tracking**: Multi-provider approach for fetching token prices (Jupiter, Raydium, Serum, and Solana)
- **Balance Management**: Simple balance tracking for different tokens
- **Trade Simulation**: Basic trade execution with price-based calculations
- **API Actions**: Example endpoints for executing trades and fetching data

#### 2.3.2 Adaptation Notes

When using the reference implementation:

- The core trading simulation logic in `services/TradeSimulator.ts` can be largely reused
- The price tracking mechanism in `services/PriceTracker.ts` with multiple providers is a robust approach to adopt
- The balance management in `services/BalanceManager.ts` provides a foundation but needs to be extended for multi-team support
- The API interface in `actions/` directory needs to be redesigned for a standalone server architecture
- The existing implementation lacks competition management features which need to be built from scratch
- Authentication and authorization need significant enhancement for the multi-team server model

Developers should use the reference implementation to understand the core trading mechanics while building a new standalone application that fulfills all the requirements in this specification.

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│                   │    │                   │    │                   │
│  Client Teams     │◄──►│  API Gateway      │◄──►│  Authentication   │
│  (Competitors)    │    │  Rate Limiting    │    │  & Authorization  │
│                   │    │                   │    │                   │
└───────────────────┘    └─────────┬─────────┘    └────────┬──────────┘
                                   │                       │
                                   ▼                       ▼
                     ┌─────────────────────────────────────────────┐
                     │                                             │
                     │              Core Services                  │
                     │                                             │
                     │  ┌─────────────┐     ┌─────────────────┐   │
                     │  │ Trading     │     │ Account         │   │
                     │  │ Service     │◄───►│ Manager         │   │
                     │  └─────────────┘     └─────────────────┘   │
                     │         │                   │              │
                     │         ▼                   ▼              │
                     │  ┌─────────────┐     ┌─────────────────┐   │
                     │  │ Price       │     │ Competition     │   │
                     │  │ Tracker     │     │ Manager         │   │
                     │  └─────────────┘     └─────────────────┘   │
                     │                                             │
                     └────────────────┬────────────────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────────────────┐
                     │                                             │
                     │              Data Storage                   │
                     │                                             │
                     │  ┌─────────────┐     ┌─────────────────┐   │
                     │  │ User        │     │ Trading         │   │
                     │  │ Database    │     │ Database        │   │
                     │  └─────────────┘     └─────────────────┘   │
                     │                                             │
                     └─────────────────────────────────────────────┘
```

### 3.2 Service Components

#### 3.2.1 API Gateway
- Handles all incoming requests
- Implements rate limiting
- Routes requests to appropriate services
- Handles request validation

#### 3.2.2 Authentication & Authorization
- API key validation
- Team identity management
- Permission enforcement
- Rate limit enforcement per team
  - 100 requests per minute for trade operations
  - 300 requests per minute for price queries
  - 30 requests per minute for balance/portfolio checks
  - 3,000 requests per minute across all endpoints
  - 10,000 requests per hour per team

#### 3.2.3 Trading Service
- Processes trade requests
- Validates trade parameters
- Executes simulated trades
- Records trade history
- Implements slippage simulation:
  ```
  baseSlippage = (tradeAmountUSD / 10000) * 0.05%
  actualSlippage = baseSlippage * (0.9 + (Math.random() * 0.2))
  finalAmount = expectedAmount * (1 - actualSlippage)
  ```

#### 3.2.4 Account Manager
- Manages virtual balances
- Tracks portfolio values
- Handles initial balance allocation
  - Default: 10 SOL, 1000 USDC, 1000 USDT per team
- Updates account states after trades

#### 3.2.5 Price Tracker
- Fetches and caches real token price data
- Provides historical price information
- Uses multiple data sources with fallback mechanisms:
  - Primary: Jupiter
  - Secondary: Raydium
  - Tertiary: Serum
  - Fallback: Basic Solana chain data
- Trades rejected if no valid price data available for tokens
- 30-second cache for price data to reduce API load

#### 3.2.6 Competition Manager
- Manages competition lifecycle with simple start/end functionality
- Competition starts when admins call start endpoint
  - Resets team balances
  - Enables trading endpoints
  - Records start timestamp
- Competition ends when admins call end endpoint
  - Disables trading (read-only mode)
  - Records end timestamp
  - Calculates final rankings
- Tracks team rankings
- Generates performance reports

### 3.3 Data Storage

#### 3.3.1 User Database
- Team information
- API key management (using secure hashing)
- Authentication records
- Team settings and preferences

#### 3.3.2 Trading Database
- Account balances
- Transaction history
- Price history
- Competition metrics

## 4. API Specifications

### 4.1 Authentication

```
POST /api/auth/login
POST /api/auth/validate
```

All protected endpoints require:
- API Key in request header (`X-API-Key`)
- Request timestamp in header (`X-Timestamp`)
- HMAC signature in header (`X-Signature`)
  - Signature = HMAC-SHA256(requestMethod + path + timestamp + requestBody, apiSecret)

### 4.2 Account Management

```
GET /api/account/balances
GET /api/account/portfolio
GET /api/account/trades
```

### 4.3 Trading Operations

```
POST /api/trade/execute
  Payload: {
    "fromToken": "string",
    "toToken": "string",
    "amount": number,
    "slippageTolerance": number (optional)
  }
  
  Notes:
  - Slippage is calculated using the formula defined in section 3.2.3
  - Minimum trade amount: 0.000001 tokens
  - Maximum single trade: 25% of team's total portfolio value
  - Transaction fees are not simulated in the MVP

GET /api/trade/quote
  Query parameters: fromToken, toToken, amount
```

### 4.4 Price Information

```
GET /api/price/current
  Query parameters: token
  
GET /api/price/history
  Query parameters: token, timeframe
```

### 4.5 Competition Information

```
GET /api/competition/leaderboard
GET /api/competition/status
GET /api/competition/rules
```

### 4.6 Admin Operations

```
POST /api/admin/teams/register
  Payload: {
    "teamName": "string",
    "email": "string",
    "contactPerson": "string"
  }
  Response: {
    "teamId": "uuid",
    "apiKey": "generated-api-key",
    "secret": "generated-secret"
  }

POST /api/admin/competition/start
  - Creates a new competition instance
  - Resets team balances to predetermined values
  - Enables trading API endpoints
  - Returns competition ID and start timestamp

POST /api/admin/competition/end
  - Disables trading API endpoints (read-only mode)
  - Records end timestamp
  - Calculates and finalizes team rankings
  - Returns competition summary

GET /api/admin/reports/performance
```

## 5. Security Considerations

### 5.1 API Security
- Use of HTTPS for all connections
- API key authentication with HMAC signatures for all endpoints
- Rate limiting to prevent abuse
- Input validation to prevent injection attacks
- API keys are 32+ random characters with high entropy
- Secrets stored using bcrypt/argon2 hashing

### 5.2 Data Protection
- Encrypted storage of sensitive data
- Backup and recovery procedures
- Audit logging for all operations
- Isolation between team data

## 6. Scalability Considerations

### 6.1 Horizontal Scaling
- Stateless API design to allow multiple instances
- Load balancing for API endpoints
- Database sharding strategies for high volumes
- Caching layers for frequent data access

### 6.2 Performance Optimization
- Optimized database queries
- Efficient trade execution algorithms
- Background processing for non-critical operations
- 30-second price data caching to reduce external API calls

## 7. Deployment Architecture

### 7.1 Infrastructure
- Cloud-based deployment (AWS/GCP/Azure)
- Containerized services with Docker
- CI/CD pipeline for automated deployments

### 7.2 Environment Strategy
- Development environment
- Staging environment
- Production environment
- Monitoring and logging infrastructure

## 8. Implementation Plan

### 8.1 Phase 1: Core Infrastructure
- Set up base server architecture
- Implement authentication system
- Develop basic trading functionality
- Create initial database schema

### 8.2 Phase 2: Trading Functionality
- Implement price tracking service
- Develop trade execution engine
- Build account management features
- Create API endpoints for trading

### 8.3 Phase 3: Competition Features
- Develop team registration system
- Create leaderboard functionality
- Implement competition start/end controls
- Build administrative dashboard

### 8.4 Phase 4: Testing and Optimization
- Conduct load testing
- Optimize performance
- Fix identified issues
- Security audit

### 8.5 Phase 5: Deployment and Operations
- Deploy to production environment
- Establish monitoring and alerting
- Prepare operational documentation
- Conduct final end-to-end testing

## 9. Technology Stack

### 9.1 Backend
- Node.js with TypeScript
- Express.js for API server
- Redis for caching and rate limiting

### 9.2 Database
- PostgreSQL for relational data
- TimescaleDB for time-series data (price history)
- Redis for caching and session management

### 9.3 DevOps
- Docker for containerization
- GitHub Actions for CI/CD
- Prometheus and Grafana for monitoring

## 10. Testing Strategy

### 10.1 Unit Testing
- Test individual components in isolation
- Use Jest for automated testing
- Aim for high test coverage of core functionality

### 10.2 Integration Testing
- Test interaction between components
- Validate API contracts
- Ensure data flow integrity

### 10.3 Load Testing
- Simulate high concurrency scenarios
- Validate system performance under load
- Identify bottlenecks and optimization opportunities

### 10.4 Security Testing
- Penetration testing
- API security validation
- Vulnerability scanning

## 11. Trading Rules and Constraints

- Trading is only allowed for tokens with valid price data
- If price data cannot be fetched from any provider, trades for that token will be rejected
- All teams start with identical token balances (10 SOL, 1000 USDC, 1000 USDT)
- Minimum trade amount: 0.000001 tokens
- Maximum single trade: 25% of team's total portfolio value
- No shorting allowed (trades limited to available balance)
- Rate limiting as defined in section 3.2.2
- Teams can only trade during active competition periods
- Slippage is applied to all trades according to the formula in section 3.2.3
- Transaction fees are not simulated in the MVP

## 12. Conclusion

This technical specification outlines the architecture and implementation plan for the Solana Trading Simulator Server. The document will guide the development team in building a robust, scalable platform that can support a trading competition with multiple teams accessing the system via API keys. 

# Multi-Chain Trading Simulator - Technical Specification

## 1. Introduction

This document outlines the technical specifications for a standalone Multi-Chain Trading Simulator Server designed to host trading competitions across multiple blockchains (Ethereum, Polygon, Base, Solana, and more). The server allows multiple teams to connect via unique API keys, submit trade requests, and track their performance without risking real assets.

## 2. Project Overview

### 2.1 Purpose

The Multi-Chain Trading Simulator Server provides a controlled environment for teams to practice and compete in simulated trading across multiple blockchains without risking real assets. This allows participants to:

- Execute trades using virtual balances on multiple chains (Ethereum, Polygon, Base, Solana, etc.)
- Perform cross-chain trades
- Track performance over time across their entire portfolio
- Compare results with other participants
- Learn about multi-chain trading dynamics in a safe environment

### 2.2 Key Features

- Team registration and API key management with HMAC authentication
- Token price tracking from DexScreener API with support for all major chains
- Multi-chain trade execution with configurable parameters
- Cross-chain trading capabilities
- Balance and portfolio tracking across multiple chains
- Performance analytics and leaderboards
- Administrative dashboard for competition management
- Chain override feature for performance optimization

### 2.3 Reference Implementation

The reference implementation provides the foundation for the multi-chain trading simulator. This implementation has been enhanced to support multiple blockchains, improved price data sources, and more efficient API responses.

#### 2.3.1 Current Architecture

The current implementation includes:

- **Price Tracking**: DexScreener API integration through the MultiChainProvider, supporting all major chains
- **Balance Management**: Multi-chain balance tracking for different tokens across EVM and Solana chains
- **Trade Simulation**: Advanced trade execution with support for cross-chain trades
- **Chain Detection**: Automatic detection of token chains with optional override for performance optimization
- **API Actions**: Comprehensive endpoints for executing trades and fetching data across chains

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│                   │    │                   │    │                   │
│  Client Teams     │◄──►│  API Gateway      │◄──►│  Authentication   │
│  (Competitors)    │    │  Rate Limiting    │    │  & Authorization  │
│                   │    │                   │    │                   │
└───────────────────┘    └─────────┬─────────┘    └────────┬──────────┘
                                   │                       │
                                   ▼                       ▼
                     ┌─────────────────────────────────────────────┐
                     │                                             │
                     │              Core Services                  │
                     │                                             │
                     │  ┌─────────────┐     ┌─────────────────┐   │
                     │  │ Trading     │     │ Account         │   │
                     │  │ Service     │◄───►│ Manager         │   │
                     │  └─────────────┘     └─────────────────┘   │
                     │         │                   │              │
                     │         ▼                   ▼              │
                     │  ┌─────────────┐     ┌─────────────────┐   │
                     │  │ Price       │     │ Competition     │   │
                     │  │ Tracker     │     │ Manager         │   │
                     │  └─────────────┘     └─────────────────┘   │
                     │         │                                  │
                     │         ▼                                  │
                     │  ┌─────────────┐                          │
                     │  │ Multi-Chain │                          │
                     │  │ Provider    │                          │
                     │  └─────────────┘                          │
                     │                                             │
                     └────────────────┬────────────────────────────┘
                                      │
                                      ▼
                     ┌─────────────────────────────────────────────┐
                     │                                             │
                     │              Data Storage                   │
                     │                                             │
                     │  ┌─────────────┐     ┌─────────────────┐   │
                     │  │ User        │     │ Trading         │   │
                     │  │ Database    │     │ Database        │   │
                     │  └─────────────┘     └─────────────────┘   │
                     │                                             │
                     └─────────────────────────────────────────────┘
```

### 3.2 Service Components

#### 3.2.1 API Gateway
- Handles all incoming requests
- Implements rate limiting
- Routes requests to appropriate services
- Handles request validation

#### 3.2.2 Authentication & Authorization
- API key validation with HMAC signatures
- Team identity management
- Permission enforcement
- Rate limit enforcement per team
  - 100 requests per minute for trade operations
  - 300 requests per minute for price queries
  - 30 requests per minute for balance/portfolio checks
  - 3,000 requests per minute across all endpoints
  - 10,000 requests per hour per team

#### 3.2.3 Trading Service
- Processes trade requests across multiple chains
- Validates trade parameters
- Executes simulated trades with chain awareness
- Records trade history with chain information
- Implements slippage simulation
- Supports cross-chain trading

#### 3.2.4 Account Manager
- Manages virtual balances across multiple chains
- Tracks multi-chain portfolio values
- Handles initial balance allocation for each chain
- Updates account states after trades

#### 3.2.5 Price Tracker
- Fetches and caches token price data across all supported chains
- Provides historical price information with chain context
- Uses DexScreener API through MultiChainProvider
- Supports chain override feature for performance optimization
- Trades rejected if no valid price data available for tokens
- 30-second cache for price data to reduce API load

#### 3.2.6 Multi-Chain Provider
- Determines token chain (EVM or SVM)
- Fetches prices from DexScreener API
- Supports specific chain overrides for EVM tokens
- Provides token information with chain details
- 10-20x performance improvement with chain override

#### 3.2.7 Competition Manager
- Manages competition lifecycle with simple start/end functionality
- Competition starts when admins call start endpoint
  - Resets team balances across all chains
  - Enables trading endpoints
  - Records start timestamp
- Competition ends when admins call end endpoint
  - Disables trading (read-only mode)
  - Records end timestamp
  - Calculates final rankings
- Tracks team rankings
- Generates performance reports

### 3.3 Data Storage

#### 3.3.1 User Database
- Team information
- API key management (using secure hashing)
- Authentication records
- Team settings and preferences

#### 3.3.2 Trading Database
- Account balances with chain information
- Transaction history with chain context
- Price history with chain details
- Competition metrics

## 4. API Specifications

### 4.1 Authentication

```
POST /api/auth/login
POST /api/auth/validate
```

All protected endpoints require:
- API Key in request header (`X-API-Key`)
- Request timestamp in header (`X-Timestamp`)
- HMAC signature in header (`X-Signature`)
  - Signature = HMAC-SHA256(requestMethod + path + timestamp + requestBody, apiSecret)

### 4.2 Account Management

```
GET /api/account/balances
  - Returns balances across all chains

GET /api/account/portfolio
  - Returns portfolio value and composition across chains

GET /api/account/trades
  - Query parameters: chain, token, limit, offset
  - Returns trade history with chain information
```

### 4.3 Trading Operations

```
POST /api/trade/execute
  Payload: {
    "fromToken": "string",  // Token address to sell
    "toToken": "string",    // Token address to buy
    "amount": "string",     // Amount to trade (as a string to preserve precision)
    "price": "string",      // Optional price to use
    "slippageTolerance": "string"  // Optional slippage tolerance (default: "0.5")
  }
  
  Notes:
  - Supports cross-chain trading automatically
  - Will detect chains based on token addresses
  - Minimum trade amount: 0.000001 tokens
  - Maximum single trade: 25% of team's total portfolio value

GET /api/trade/quote
  Query parameters: fromToken, toToken, amount
```

### 4.4 Price Information

```
GET /api/price
  Query parameters: 
    - token (required): Token address
    - chain (optional): "svm" or "evm" to override automatic detection
    - specificChain (optional): "eth", "polygon", "base", etc. for EVM tokens
  
  Notes:
  - Using specificChain improves response time from 1-3 seconds to 50-100ms
  
GET /api/price/token-info
  Query parameters: 
    - token (required): Token address
    - chain (optional): "svm" or "evm"
    - specificChain (optional): For EVM tokens
  
GET /api/price/history
  Query parameters: 
    - token (required): Token address
    - startTime (optional): ISO timestamp
    - endTime (optional): ISO timestamp
    - interval (optional): "1m", "5m", "15m", "1h", "4h", "1d"
    - chain (optional): "svm" or "evm"
    - specificChain (optional): For EVM tokens
```

### 4.5 Competition Information

```
GET /api/competition/leaderboard
GET /api/competition/status
GET /api/competition/rules
```

### 4.6 Admin Operations

```
POST /api/admin/teams/register
  Payload: {
    "teamName": "string",
    "email": "string",
    "contactPerson": "string"
  }
  Response: {
    "teamId": "uuid",
    "apiKey": "generated-api-key",
    "secret": "generated-secret"
  }

POST /api/admin/competition/start
  - Creates a new competition instance
  - Resets team balances across all chains to predetermined values
  - Enables trading API endpoints
  - Returns competition ID and start timestamp

POST /api/admin/competition/end
  - Disables trading API endpoints (read-only mode)
  - Records end timestamp
  - Calculates and finalizes team rankings
  - Returns competition summary

GET /api/admin/reports/performance
```

## 5. Security Considerations

### 5.1 API Security
- Use of HTTPS for all connections
- API key authentication with HMAC signatures for all endpoints
- Rate limiting to prevent abuse
- Input validation to prevent injection attacks
- API keys are 32+ random characters with high entropy
- API secrets stored using secure methods:
  - Bcrypt hash for authentication
  - Encrypted version for HMAC validation
- Master encryption key for additional security

### 5.2 Data Protection
- Encrypted storage of sensitive data
- Backup and recovery procedures
- Audit logging for all operations
- Isolation between team data

## 6. Scalability Considerations

### 6.1 Horizontal Scaling
- Stateless API design to allow multiple instances
- Load balancing for API endpoints
- Database sharding strategies for high volumes
- Caching layers for frequent data access

### 6.2 Performance Optimization
- Chain override feature for 10-20x faster price lookups
- Optimized database queries with chain-specific indexes
- Efficient trade execution algorithms
- Background processing for non-critical operations
- Price data caching to reduce external API calls

## 7. Multi-Chain Support

### 7.1 Supported Chains
- **Solana Virtual Machine (SVM)**
  - Solana Mainnet
- **Ethereum Virtual Machine (EVM)**
  - Ethereum Mainnet (eth)
  - Polygon Network (polygon)
  - Binance Smart Chain (bsc)
  - Arbitrum One (arbitrum)
  - Base (base)
  - Optimism (optimism)
  - Avalanche C-Chain (avalanche)
  - Linea (linea)

### 7.2 Chain Detection
- Automatic detection based on token address format
- EVM addresses: 0x followed by 40 hex characters
- SVM addresses: Base58 encoded (typically 44 characters)
- Optional chain override for improved performance

### 7.3 Cross-Chain Trading
- Seamless trading between different chains
- Automatic conversion using current market rates
- Chain-specific balance updates
- Tracking of cross-chain trade history

### 7.4 Token Standards
- ERC-20 for EVM chains
- SPL Tokens for Solana

## 8. Initial Balance Configuration

### 8.1 Environment Configuration
Set initial balances for each chain using environment variables:

#### 8.1.1 Solana (SVM) Token Balances
```
INITIAL_SVM_SOL_BALANCE=0       # Initial SOL balance
INITIAL_SVM_USDC_BALANCE=10000  # Initial USDC balance on Solana
INITIAL_SVM_USDT_BALANCE=0      # Initial USDT balance on Solana
```

#### 8.1.2 Ethereum (EVM) Token Balances - General
```
INITIAL_EVM_ETH_BALANCE=0       # Initial ETH balance
INITIAL_EVM_USDC_BALANCE=1000   # Initial USDC balance on Ethereum
INITIAL_EVM_USDT_BALANCE=0      # Initial USDT balance on Ethereum
```

#### 8.1.3 Specific EVM Chain Balances
```
# Ethereum Mainnet Specific Balances
INITIAL_ETH_ETH_BALANCE=1       # Initial ETH balance on Ethereum Mainnet
INITIAL_ETH_USDC_BALANCE=1000   # Initial USDC balance on Ethereum Mainnet

# Polygon Specific Balances
INITIAL_POLYGON_MATIC_BALANCE=10  # Initial MATIC balance on Polygon
INITIAL_POLYGON_USDC_BALANCE=1000 # Initial USDC balance on Polygon

# Base Specific Balances
INITIAL_BASE_ETH_BALANCE=1        # Initial ETH balance on Base
INITIAL_BASE_USDC_BALANCE=1000    # Initial USDC balance on Base
```

### 8.2 Chain Priority Configuration
```
# Comma-separated list of EVM chains to query in order of priority
EVM_CHAINS=eth,polygon,base,arbitrum,optimism,bsc,avalanche,linea
```

## 9. Technology Stack

### 9.1 Backend
- Node.js with TypeScript
- Express.js for API server
- PostgreSQL for database
- Redis for caching and rate limiting

### 9.2 Integrations
- DexScreener API for multi-chain price data

### 9.3 DevOps
- Docker for containerization
- GitHub Actions for CI/CD
- Prometheus and Grafana for monitoring

## 10. Trading Rules and Constraints

- Trading is only allowed for tokens with valid price data
- If price data cannot be fetched, trades for that token will be rejected
- Teams start with configured balances for each chain
- Minimum trade amount: 0.000001 tokens
- Maximum single trade: 25% of team's total portfolio value
- No shorting allowed (trades limited to available balance)
- Rate limiting as defined in section 3.2.2
- Teams can only trade during active competition periods
- Slippage is applied to all trades

## 11. Chain Override Performance Optimization

The chain override feature significantly improves API response times when fetching token prices on EVM chains:

- **Without chain override**: 1-3 seconds response time (checking multiple chains)
- **With chain override**: 50-100ms response time (direct API call to specified chain)

This represents a 10-20x performance improvement.

### Usage Example:
```
GET /api/price?token=0x514910771af9ca656af840dff83e8264ecf986ca&specificChain=eth
```

For optimal performance, maintain a mapping of tokens to their specific chains:

```typescript
const TOKEN_CHAINS = {
  // EVM tokens with their specific chains
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'eth',    // WETH on Ethereum
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'eth',    // LINK on Ethereum
  '0x912CE59144191C1204E64559FE8253a0e49E6548': 'arbitrum', // ARB on Arbitrum
  '0x532f27101965dd16442E59d40670FaF5eBB142E4': 'base',   // TOSHI on Base
};
```

## 12. Conclusion

This technical specification outlines the architecture and implementation of the Multi-Chain Trading Simulator Server. The document serves as a guide for understanding the system's capabilities, API endpoints, and configuration options, with a particular focus on the multi-chain architecture and performance optimizations. 