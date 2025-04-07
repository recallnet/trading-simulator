# Multi-Chain Trading Simulator Server - Technical Specification

## 1. Introduction

This document outlines the technical specifications for a standalone Multi-Chain Trading Simulator Server designed to host a competition that involves simulated trading across multiple blockchains. The server will allow multiple teams to connect via unique API keys, submit trade requests, and keep track of individual team performances across different blockchain networks.

## 2. Project Overview

### 2.1 Purpose

The Multi-Chain Trading Simulator Server will provide a controlled environment for teams to practice and compete in simulated trading across multiple blockchains (Ethereum, Polygon, Base, Solana, and more) without risking real assets. This will allow participants to:

- Execute trades using virtual balances across multiple chains
- Perform cross-chain trading (if enabled)
- Track performance over time across their entire portfolio
- Compare results with other participants
- Learn about multi-chain token trading in a safe environment

### 2.2 Key Features

- Team registration and API key management with Bearer token authentication
- Token price simulation using real market data from multiple chains
- Multi-chain trade execution with configurable parameters
- Cross-chain trading capabilities (optional)
- Balance and portfolio tracking across multiple blockchains
- Performance analytics and leaderboards
- Administrative dashboard for competition management
- Chain override feature for high-performance price lookups

### 2.3 Reference Implementation

A reference implementation of the core trading functionality can be found in the project repository. This implementation has been enhanced to support multiple blockchains, improved price data sources, and more efficient API responses.

#### 2.3.1 Current Architecture

The current implementation includes:

- **Price Tracking**: DexScreener API integration through the MultiChainProvider, supporting all major chains
- **Balance Management**: Multi-chain balance tracking for different tokens across EVM and Solana chains
- **Trade Simulation**: Advanced trade execution with support for cross-chain trades
- **Chain Detection**: Automatic detection of token chains with optional override for performance optimization
- **API Actions**: Comprehensive endpoints for executing trades and fetching data across chains

#### 2.3.2 Adaptation Notes

The core trading simulation logic has been extended to support:

- Multiple blockchain networks (EVM chains like Ethereum, Polygon, Base, and SVM chains like Solana)
- Cross-chain trading capabilities
- Enhanced price tracking with chain detection and override
- Optimized API responses with chain-specific data
- Comprehensive team management and competition features

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
- API key validation using Bearer token authentication
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
- Implements slippage simulation:
  ```
  baseSlippage = (tradeAmountUSD / 10000) * 0.05%
  actualSlippage = baseSlippage * (0.9 + (Math.random() * 0.2))
  finalAmount = expectedAmount * (1 - actualSlippage)
  ```
- Supports cross-chain trading (if enabled)

#### 3.2.4 Account Manager
- Manages virtual balances across multiple chains
- Tracks portfolio values across all supported blockchains
- Handles initial balance allocation for each supported chain
  - Default balances configurable via environment variables
  - Chain-specific balance overrides available
- Updates account states after trades
- Maintains separate balances for each blockchain

#### 3.2.5 Price Tracker
- Fetches and caches token price data across all supported chains
- Provides historical price information with chain context
- Uses multiple data sources with fallback mechanisms:
  - Primary: DexScreener API for all chains
  - Secondary providers for specific chains
- Supports chain override feature for optimized performance
  - 10-20x faster price lookups with specific chain information
- Trades rejected if no valid price data available for tokens
- 30-second cache for price data to reduce API load

#### 3.2.6 Multi-Chain Provider
- Determines token chain (EVM or SVM)
- Fetches prices from various providers based on chain
- Supports specific chain overrides for EVM tokens
- Provides token information with chain details
- Handles chain-specific price formatting and normalization

#### 3.2.7 Competition Manager
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
- Bearer token authentication in the Authorization header
  - Format: `Authorization: Bearer YOUR_API_KEY`

### 4.2 Account Management

```
GET /api/account/balances
  Returns balances across all supported chains
  
  Response: {
    "success": true,
    "teamId": "string",
    "balances": [
      { "token": "string", "amount": number, "chain": "string", "specificChain": "string" }
    ]
  }
  
  Note: Client typically transforms this to a more convenient format:
  {
    "success": true,
    "teamId": "string",
    "balance": {
      "tokenAddress1": number,
      "tokenAddress2": number
    }
  }

GET /api/account/portfolio
  Returns portfolio value and composition across chains
  
  Response: {
    "success": true,
    "teamId": "string",
    "portfolioValue": number,
    "tokens": [
      { 
        "token": "string", 
        "amount": number,
        "valueUsd": number,
        "chain": "string",
        "specificChain": "string"
      }
    ]
  }

GET /api/account/trades
  Query parameters: 
    - chain (optional): Filter by blockchain type ("svm" or "evm")
    - token (optional): Filter by token address
    - limit (optional): Number of trades to return (default: 100)
    - offset (optional): Pagination offset (default: 0)
  
  Returns trade history with chain information
  
  Response: {
    "success": true,
    "teamId": "string",
    "trades": [
      {
        "id": "string",
        "timestamp": "string",
        "fromToken": "string",
        "toToken": "string",
        "fromAmount": "string",
        "toAmount": "string",
        "fromChain": "string",
        "toChain": "string",
        "fromSpecificChain": "string",
        "toSpecificChain": "string",
        "status": "string"
      }
    ],
    "count": number,
    "total": number
  }
```

### 4.3 Trading Operations

```
POST /api/trade/execute
  Payload: {
    "fromToken": "string",  // Token address to sell
    "toToken": "string",    // Token address to buy
    "amount": "string",     // Amount to trade (as a string to preserve precision)
    "slippageTolerance": "string" (optional),  // Default: "0.5"
    "fromChain": "string" (optional),  // "svm" or "evm"
    "toChain": "string" (optional),    // "svm" or "evm"
    "fromSpecificChain": "string" (optional),  // e.g., "eth", "polygon", "base"
    "toSpecificChain": "string" (optional)     // e.g., "eth", "polygon", "base"
  }
  
  Response: {
    "success": true,
    "trade": {
      "id": "string",
      "fromToken": "string",
      "toToken": "string",
      "fromAmount": "string",
      "toAmount": "string",
      "fromChain": "string",
      "toChain": "string",
      "timestamp": "string",
      "status": "completed"
    }
  }
  
  Notes:
  - Cross-chain trading configurable via environment variables
  - Chain detection based on token address format
  - Minimum trade amount: 0.000001 tokens
  - Maximum single trade: 25% of team's total portfolio value
  - Transaction fees are not simulated in the MVP

GET /api/trade/quote
  Query parameters: 
    - fromToken (required): Token address to sell
    - toToken (required): Token address to buy
    - amount (required): Amount to trade
    - fromChain (optional): "svm" or "evm"
    - toChain (optional): "svm" or "evm"
    - fromSpecificChain (optional): e.g., "eth", "polygon", "base"
    - toSpecificChain (optional): e.g., "eth", "polygon", "base"
  
  Response: {
    "success": true,
    "quote": {
      "fromToken": "string",
      "toToken": "string",
      "fromAmount": "string",
      "estimatedToAmount": "string",
      "exchangeRate": "string",
      "timestamp": "string"
    }
  }
```

### 4.4 Price Information

```
GET /api/price
  Query parameters: 
    - token (required): Token address
    - chain (optional): "svm" or "evm" to override automatic detection
    - specificChain (optional): "eth", "polygon", "base", etc. for EVM tokens
  
  Response: {
    "success": true,
    "token": "string",
    "price": number,
    "chain": "string",
    "specificChain": "string",
    "timestamp": "string"
  }
  
  Notes:
  - Using specificChain improves response time from 1-3 seconds to 50-100ms
  
GET /api/price/token-info
  Query parameters: 
    - token (required): Token address
    - chain (optional): "svm" or "evm"
    - specificChain (optional): For EVM tokens
  
  Response: {
    "success": true,
    "token": "string",
    "name": "string",
    "symbol": "string",
    "decimals": number,
    "chain": "string",
    "specificChain": "string",
    "price": number,
    "timestamp": "string"
  }
  
GET /api/price/history
  Query parameters: 
    - token (required): Token address
    - startTime (optional): ISO timestamp
    - endTime (optional): ISO timestamp
    - interval (optional): "1m", "5m", "15m", "1h", "4h", "1d"
    - chain (optional): "svm" or "evm"
    - specificChain (optional): For EVM tokens
  
  Response: {
    "success": true,
    "token": "string",
    "chain": "string",
    "specificChain": "string",
    "prices": [
      {
        "timestamp": "string",
        "price": number
      }
    ]
  }
```

### 4.5 Competition Information

```
GET /api/competition/leaderboard
  Response: {
    "success": true,
    "competition": {
      "id": "string",
      "name": "string",
      "status": "string"
    },
    "leaderboard": [
      {
        "teamId": "string",
        "teamName": "string",
        "portfolioValue": number,
        "rank": number,
        "change24h": number
      }
    ]
  }

GET /api/competition/status
  Response: {
    "success": true,
    "competition": {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "string",
      "startTime": "string",
      "endTime": "string"
    },
    "isActive": boolean,
    "timeRemaining": number
  }

GET /api/competition/rules
  Response: {
    "success": true,
    "rules": [
      "string"
    ]
  }
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
    "success": true,
    "team": {
      "id": "string",
      "name": "string",
      "email": "string",
      "contactPerson": "string",
      "apiKey": "string",
      "createdAt": "string"
    }
  }

GET /api/admin/teams
  Returns list of all registered teams
  
  Response: {
    "success": true,
    "teams": [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "contactPerson": "string",
        "createdAt": "string"
      }
    ]
  }

DELETE /api/admin/teams/{teamId}
  Deletes a team by ID
  
  Response: {
    "success": true,
    "message": "Team deleted successfully"
  }

POST /api/admin/competition/start
  Payload: {
    "name": "string",
    "description": "string",
    "teamIds": ["string"]
  }
  
  Response: {
    "success": true,
    "competition": {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "active",
      "startTime": "string"
    }
  }
  
  Notes:
  - Creates a new competition instance
  - Resets team balances across all chains to predetermined values
  - Enables trading API endpoints
  - Returns competition ID and start timestamp

POST /api/admin/competition/end
  Payload: {
    "competitionId": "string"
  }
  
  Response: {
    "success": true,
    "competition": {
      "id": "string",
      "name": "string",
      "status": "completed",
      "startTime": "string",
      "endTime": "string",
      "finalRankings": [
        {
          "teamId": "string",
          "teamName": "string",
          "rank": number,
          "portfolioValue": number
        }
      ]
    }
  }
  
  Notes:
  - Disables trading API endpoints (read-only mode)
  - Records end timestamp
  - Calculates and finalizes team rankings
  - Returns competition summary

GET /api/admin/reports/performance
  Response: {
    "success": true,
    "systemPerformance": {
      "totalRequests": number,
      "avgResponseTime": number,
      "errorRate": number
    },
    "teamActivity": [
      {
        "teamId": "string",
        "teamName": "string",
        "totalTrades": number,
        "requestsLastHour": number
      }
    ]
  }
```

## 5. Security Considerations

### 5.1 API Security
- Use of HTTPS for all connections
- Bearer token authentication for all endpoints 
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
- Seamless trading between different chains (if enabled)
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
INITIAL_SVM_SOL_BALANCE=10      # Initial SOL balance
INITIAL_SVM_USDC_BALANCE=5000   # Initial USDC balance on Solana
INITIAL_SVM_USDT_BALANCE=1000   # Initial USDT balance on Solana
```

#### 8.1.2 Ethereum (EVM) Token Balances - General
```
INITIAL_EVM_ETH_BALANCE=1       # Initial ETH balance
INITIAL_EVM_USDC_BALANCE=5000   # Initial USDC balance on Ethereum
INITIAL_EVM_USDT_BALANCE=1000   # Initial USDT balance on Ethereum
```

#### 8.1.3 Specific EVM Chain Balances
```
# Ethereum Mainnet Specific Balances
INITIAL_ETH_ETH_BALANCE=1       # Initial ETH balance on Ethereum Mainnet
INITIAL_ETH_USDC_BALANCE=5000   # Initial USDC balance on Ethereum Mainnet

# Polygon Specific Balances
INITIAL_POLYGON_ETH_BALANCE=10  # Initial ETH balance on Polygon
INITIAL_POLYGON_USDC_BALANCE=5000 # Initial USDC balance on Polygon

# Base Specific Balances
INITIAL_BASE_ETH_BALANCE=1        # Initial ETH balance on Base
INITIAL_BASE_USDC_BALANCE=5000    # Initial USDC balance on Base
```

### 8.2 Chain Priority Configuration
```
# Comma-separated list of EVM chains to query in order of priority
EVM_CHAINS=eth,polygon,base,arbitrum,optimism,bsc,avalanche,linea
```

## 9. Chain Override Performance Optimization

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

## 10. Deployment Architecture

### 10.1 Infrastructure
- Cloud-based deployment (AWS/GCP/Azure)
- Containerized services with Docker
- CI/CD pipeline for automated deployments

### 10.2 Environment Strategy
- Development environment
- Staging environment
- Production environment
- Monitoring and logging infrastructure

## 11. Implementation Plan

### 11.1 Phase 1: Core Infrastructure
- Set up base server architecture
- Implement authentication system
- Develop basic trading functionality
- Create initial database schema

### 11.2 Phase 2: Trading Functionality
- Implement price tracking service with multi-chain support
- Develop trade execution engine with chain awareness
- Build account management features for multiple chains
- Create API endpoints for trading

### 11.3 Phase 3: Competition Features
- Develop team registration system
- Create leaderboard functionality
- Implement competition start/end controls
- Build administrative dashboard

### 11.4 Phase 4: Testing and Optimization
- Conduct load testing
- Optimize performance with chain override feature
- Fix identified issues
- Security audit

### 11.5 Phase 5: Deployment and Operations
- Deploy to production environment
- Establish monitoring and alerting
- Prepare operational documentation
- Conduct final end-to-end testing

## 12. Technology Stack

### 12.1 Backend
- Node.js with TypeScript
- Express.js for API server
- Redis for caching and rate limiting

### 12.2 Database
- PostgreSQL for relational data
- TimescaleDB for time-series data (price history)
- Redis for caching and session management

### 12.3 DevOps
- Docker for containerization
- GitHub Actions for CI/CD
- Prometheus and Grafana for monitoring

## 13. Testing Strategy

### 13.1 Unit Testing
- Test individual components in isolation
- Use Jest for automated testing
- Aim for high test coverage of core functionality

### 13.2 Integration Testing
- Test interaction between components
- Validate API contracts
- Ensure data flow integrity

### 13.3 Load Testing
- Simulate high concurrency scenarios
- Validate system performance under load
- Identify bottlenecks and optimization opportunities

### 13.4 Security Testing
- Penetration testing
- API security validation
- Vulnerability scanning

## 14. Trading Rules and Constraints

- Trading is only allowed for tokens with valid price data
- If price data cannot be fetched from any provider, trades for that token will be rejected
- Teams start with configured balances for each supported chain
- Minimum trade amount: 0.000001 tokens
- Maximum single trade: 25% of team's total portfolio value
- No shorting allowed (trades limited to available balance)
- Rate limiting as defined in section 3.2.2
- Teams can only trade during active competition periods
- Slippage is applied to all trades according to the formula in section 3.2.3
- Cross-chain trading can be enabled/disabled via configuration
- Transaction fees are not simulated in the MVP

## 15. Conclusion

This technical specification outlines the architecture and implementation plan for the Multi-Chain Trading Simulator Server. The document will guide the development team in building a robust, scalable platform that can support trading competitions across multiple blockchains with multiple teams accessing the system via API keys. 