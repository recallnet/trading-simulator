# Trading Simulator API Documentation

This document provides comprehensive details on how to interact with the Trading Simulator API. The API allows teams to check balances, execute trades, and participate in trading competitions.

## Authentication

The Trading Simulator API uses HMAC-based authentication to secure all API requests.

### Required Headers

For each API request, you must include the following headers:

| Header | Description |
|--------|-------------|
| `X-API-Key` | Your team's API key, provided during registration |
| `X-Timestamp` | Current ISO timestamp (e.g., `2025-03-11T21:54:54.386Z`) |
| `X-Signature` | HMAC-SHA256 signature (see below) |
| `Content-Type` | Set to `application/json` for all requests |

### Generating the Signature

The signature is calculated using HMAC-SHA256 with your API secret as the key, and the following string as the data:

```
<method><path><timestamp><body>
```

Where:
- `<method>` is the HTTP method (e.g., `GET`, `POST`)
- `<path>` is the request path (e.g., `/api/account/balances`)
- `<timestamp>` is the ISO timestamp in the `X-Timestamp` header
- `<body>` is the JSON request body as a string (empty string for GET requests)

### Example (TypeScript/JavaScript)

```typescript
import * as crypto from 'crypto';

const apiKey = 'sk_ee08b6e5d6571bd78c3efcc64ae1da0e';
const apiSecret = 'f097f3c2a7ee7e043c1152c7943ea95906b7bcd54276b506aa19931efd45239c';

// Request details
const method = 'GET';
const path = '/api/account/balances';
const timestamp = new Date().toISOString();
const body = ''; // Empty string for GET requests

// Calculate signature
const data = method + path + timestamp + body;
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(data)
  .digest('hex');

// Headers for the request
const headers = {
  'X-API-Key': apiKey,
  'X-Timestamp': timestamp,
  'X-Signature': signature,
  'Content-Type': 'application/json'
};

// Full request URL would be:
// const url = 'http://localhost:3001/api/account/balances';
```

### Security Notes

- Always keep your API secret secure and never expose it
- The timestamp must be within 5 minutes of the server time to prevent replay attacks
- Use HTTPS for all API requests in production environments

## Multi-Chain Support

The Trading Simulator supports tokens on multiple blockchains:

- **Solana Virtual Machine (SVM)** - Token addresses like `So11111111111111111111111111111111111111112` (SOL)
- **Ethereum Virtual Machine (EVM)** - Token addresses like `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` (WETH)

The system automatically detects which blockchain a token belongs to based on its address format. All price-related API responses include a `chain` field that indicates which blockchain the token is on (`svm` or `evm`).

### Token Address Examples

| Chain | Token | Address |
|-------|-------|---------|
| Solana | SOL | `So11111111111111111111111111111111111111112` |
| Solana | USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Ethereum | WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| Ethereum | USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |

### Chain Override Feature

For EVM tokens, the API needs to determine which specific chain a token exists on (Ethereum, Polygon, Base, etc.). By default, this involves checking multiple chains in sequence which can take several seconds. 

To significantly improve API response times, you can use the optional `specificChain` parameter when you already know which chain the token is on:

- **With Chain Detection**: 1-3 seconds response time (checking multiple chains)
- **With Chain Override**: 50-100ms response time (direct API call to the specified chain)

#### Supported Specific Chains

| specificChain | Description |
|---------------|-------------|
| eth | Ethereum Mainnet |
| polygon | Polygon Network |
| bsc | Binance Smart Chain |
| arbitrum | Arbitrum One |
| base | Base |
| optimism | Optimism |
| avalanche | Avalanche C-Chain |
| linea | Linea |
| svm | Solana (for SVM tokens) |

#### Example Usage

```
GET /api/price?token=0x514910771af9ca656af840dff83e8264ecf986ca&specificChain=eth
```

This request will directly fetch the price for Chainlink (LINK) token on Ethereum Mainnet, bypassing the chain detection process.

## API Endpoints

### Account

#### Get Balances

Returns the current balances for your team across all tokens.

- **URL:** `/api/account/balances`
- **Method:** `GET`
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "balances": [
    {
      "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "amount": "100000.00",
      "chain": "svm"
    },
    {
      "token": "So11111111111111111111111111111111111111112",
      "amount": "50.0",
      "chain": "svm"
    },
    {
      "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "amount": "5.0",
      "chain": "evm"
    }
  ]
}
```

#### Get Portfolio

Returns the portfolio information for your team.

- **URL:** `/api/account/portfolio`
- **Method:** `GET`
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "portfolio": {
    "totalValueUSD": "125000.00",
    "positions": [
      {
        "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "amount": "100000.00",
        "valueUSD": "100000.00",
        "percentage": "80.0",
        "chain": "svm"
      },
      {
        "token": "So11111111111111111111111111111111111111112",
        "amount": "50.0",
        "valueUSD": "25000.00",
        "percentage": "20.0",
        "chain": "svm"
      }
    ]
  }
}
```

#### Get Trades

Returns the trade history for your team.

- **URL:** `/api/account/trades`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**
  - `limit` (optional, default: 50)
  - `offset` (optional, default: 0)
  - `token` (optional, filter by token)
  - `chain` (optional, filter by chain - "svm" or "evm")

**Response Example:**
```json
{
  "success": true,
  "trades": [
    {
      "id": "t_12345",
      "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "fromChain": "svm",
      "toToken": "So11111111111111111111111111111111111111112",
      "toChain": "svm",
      "fromAmount": "1000.00",
      "toAmount": "5.0",
      "priceAtExecution": "200.00",
      "timestamp": "2025-03-11T21:54:54.386Z",
      "slippage": "0.05"
    },
    {
      "id": "t_12346",
      "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "fromChain": "svm",
      "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "toChain": "evm",
      "fromAmount": "2000.00",
      "toAmount": "0.5",
      "priceAtExecution": "4000.00",
      "timestamp": "2025-03-11T22:12:34.386Z",
      "slippage": "0.05"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 50,
    "offset": 0
  }
}
```

### Price Information

#### Get Current Price

Returns the current price for a specific token on either Solana or Ethereum blockchain.

- **URL:** `/api/price`
- **Method:** `GET`
- **Query Parameters:** 
  - `token` (required, token address e.g., "So11111111111111111111111111111111111111112" for SOL or "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" for WETH)
  - `chain` (optional, one of: "svm", "evm" - overrides automatic chain detection)
  - `specificChain` (optional, one of: "eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm" - specifies the exact chain for EVM tokens, significantly improving response time)
- **Authentication:** Required

**Response Example for Solana Token:**
```json
{
  "success": true,
  "price": 123.45,
  "token": "So11111111111111111111111111111111111111112",
  "chain": "svm"
}
```

**Response Example for Ethereum Token:**
```json
{
  "success": true,
  "price": 3500.75,
  "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "chain": "evm",
  "specificChain": "eth"
}
```

**Response Example for Base Chain Token with Chain Override:**
```json
{
  "success": true,
  "price": 0.78,
  "token": "0x532f27101965dd16442E59d40670FaF5eBB142E4",
  "chain": "evm",
  "specificChain": "base"
}
```

#### Get Token Info

Returns detailed information about a token, including its chain type and specific chain (for EVM tokens).

- **URL:** `/api/price/token-info`
- **Method:** `GET`
- **Query Parameters:** 
  - `token` (required, token address)
  - `chain` (optional, one of: "svm", "evm" - overrides automatic chain detection)
  - `specificChain` (optional, one of: "eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm" - specifies the exact chain for EVM tokens, significantly improving response time)
- **Authentication:** Required

**Response Example for Solana Token:**
```json
{
  "success": true,
  "price": 123.45,
  "token": "So11111111111111111111111111111111111111112",
  "chain": "svm",
  "specificChain": "svm"
}
```

**Response Example for Ethereum Token:**
```json
{
  "success": true,
  "price": 3500.75,
  "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "chain": "evm",
  "specificChain": "eth"
}
```

**Response Example for Base Chain Token:**
```json
{
  "success": true,
  "price": 0.78,
  "token": "0x532f27101965dd16442E59d40670FaF5eBB142E4",
  "chain": "evm",
  "specificChain": "base"
}
```

#### Get Price From Provider

Returns the price for a specific token from a specific provider.

- **URL:** `/api/price/provider`
- **Method:** `GET`
- **Query Parameters:** 
  - `token` (required, token address)
  - `provider` (required, one of: "jupiter", "raydium", "serum", "noves", "multi-chain")
  - `chain` (optional, one of: "svm", "evm" - overrides automatic chain detection)
  - `specificChain` (optional, one of: "eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm" - specifies the exact chain for EVM tokens when using the "noves" or "multi-chain" provider)
- **Authentication:** Required

**Response Example for Solana Token:**
```json
{
  "success": true,
  "price": 123.45,
  "token": "So11111111111111111111111111111111111111112",
  "provider": "jupiter",
  "chain": "svm"
}
```

**Response Example for Ethereum Token using Noves provider:**
```json
{
  "success": true,
  "price": 3500.75,
  "token": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "provider": "noves",
  "chain": "evm",
  "specificChain": "eth"
}
```

**Response Example for Chainlink Token using Multi-chain provider with specific chain override:**
```json
{
  "success": true,
  "price": 14.48,
  "token": "0x514910771af9ca656af840dff83e8264ecf986ca",
  "provider": "multi-chain",
  "chain": "evm",
  "specificChain": "eth"
}
```

> **Note:** The `/api/price/provider` endpoint has been deprecated and is no longer available.
> The system now uses the DexScreener provider through MultiChainProvider for all price fetching.
> Please use the main `/api/price` endpoint with optional `chain` and `specificChain` parameters instead.

#### Get Price History

Returns historical price data for a specific token.

- **URL:** `/api/price/history`
- **Method:** `GET`
- **Query Parameters:** 
  - `token` (required, token address)
  - `startTime` (optional, ISO timestamp)
  - `endTime` (optional, ISO timestamp)
  - `interval` (optional, "1m", "5m", "15m", "1h", "4h", "1d")
  - `chain` (optional, one of: "svm", "evm" - overrides automatic chain detection)
  - `specificChain` (optional, one of: "eth", "polygon", "bsc", "arbitrum", "base", "optimism", "avalanche", "linea", "svm" - specifies the exact chain for EVM tokens, improving response time)
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "priceHistory": [
    {
      "token": "So11111111111111111111111111111111111111112",
      "usdPrice": 123.45,
      "timestamp": "2025-03-11T21:00:00.000Z",
      "chain": "svm"
    },
    {
      "token": "So11111111111111111111111111111111111111112",
      "usdPrice": 124.50,
      "timestamp": "2025-03-11T22:00:00.000Z",
      "chain": "svm"
    }
  ]
}
```

### Price Providers

The Trading Simulator supports multiple price providers for different blockchains:

#### Solana (SVM) Providers
- **Jupiter**: Primary provider for Solana tokens, using Jupiter Aggregator
- **Raydium**: Alternative provider using Raydium DEX
- **Serum**: Alternative provider using Serum DEX

#### Multi-Chain Provider
- **Noves**: Supports both Solana (SVM) and Ethereum (EVM) tokens

The system automatically selects the appropriate provider based on the token's blockchain. For Ethereum tokens, Noves is used as the primary provider. For Solana tokens, all providers are tried in sequence until a valid price is found.

### Trading

#### Execute Trade

Executes a trade between two tokens, supporting cross-chain trading.

- **URL:** `/api/trade/execute`
- **Method:** `POST`
- **Authentication:** Required
- **Request Body:**
```json
{
  "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "amount": "1000.00",
  "price": "3500.75",
  "slippageTolerance": "0.5"
}
```

**Response Example:**
```json
{
  "success": true,
  "transaction": {
    "id": "21fd8603-8fc3-4ff2-9012-baa6b05838fc",
    "timestamp": "2025-03-11T21:54:54.386Z",
    "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "fromChain": "svm",
    "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "toChain": "evm",
    "fromAmount": "1000.00",
    "toAmount": "0.285",
    "price": "3500.75",
    "success": true,
    "teamId": "2cbb016d-0002-4d01-ba32-8dd400e25756",
    "competitionId": "8b912dfa-22a5-4a4f-b660-e7715dde10f2"
  }
}
```

**Note**: The client should handle the conversion between the easier-to-use format (tokenAddress, side, amount) and the API format (fromToken, toToken, amount).

#### Get Quote

Returns a quote for a potential trade, supporting cross-chain trading.

- **URL:** `/api/trade/quote`
- **Method:** `GET`
- **Authentication:** Required
- **Query Parameters:**
  - `fromToken` (required)
  - `toToken` (required)
  - `amount` (required)

**Response Example:**
```json
{
  "success": true,
  "quote": {
    "fromToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "fromChain": "svm",
    "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "toChain": "evm",
    "fromAmount": "1000.00",
    "estimatedToAmount": "0.285",
    "estimatedPriceImpact": "0.5",
    "timestamp": "2025-03-11T21:54:54.386Z"
  }
}
```

### Competition

#### Get Competition Status

Returns the status of the current competition.

- **URL:** `/api/competition/status`
- **Method:** `GET`
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "competition": {
    "id": "c_12345",
    "name": "Spring 2025 Solana Trading Competition",
    "status": "active",
    "startTime": "2025-03-01T00:00:00.000Z",
    "endTime": "2025-03-31T23:59:59.999Z",
    "timeRemaining": "20d 2h 5m 5s"
  }
}
```

#### Get Competition Leaderboard

Returns the current competition leaderboard.

- **URL:** `/api/competition/leaderboard`
- **Method:** `GET`
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "competition": {
    "id": "c_12345",
    "name": "Spring 2025 Solana Trading Competition"
  },
  "leaderboard": [
    {
      "rank": 1,
      "teamName": "Alpha Traders",
      "portfolioValue": "120345.67",
      "percentageGain": "20.34"
    },
    {
      "rank": 2,
      "teamName": "Beta Investment",
      "portfolioValue": "115678.90",
      "percentageGain": "15.68"
    }
  ]
}
```

#### Get Competition Rules

Returns the rules for the current competition.

- **URL:** `/api/competition/rules`
- **Method:** `GET`
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "rules": {
    "tradingRules": [
      "Initial balance is 10 SOL, 1000 USDC, 1000 USDT, and 0.2 ETH",
      "Trading is allowed 24/7 during the competition period",
      "Maximum single trade: 25% of team's total portfolio value",
      "Cross-chain trading is allowed between Solana and Ethereum tokens"
    ],
    "supportedChains": ["svm", "evm"],
    "rateLimits": {
      "tradeRequestsPerMinute": 100,
      "priceRequestsPerMinute": 300,
      "accountRequestsPerMinute": 30,
      "totalRequestsPerMinute": 3000,
      "totalRequestsPerHour": 10000
    },
    "slippageFormula": "baseSlippage = (tradeAmountUSD / 10000) * 0.05%, actualSlippage = baseSlippage * (0.9 + (Math.random() * 0.2))"
  }
}
```

## Error Handling

The API returns standard HTTP status codes and a JSON response with error details.

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Invalid signature provided"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | The API key is invalid or missing |
| `INVALID_SIGNATURE` | The signature is invalid |
| `TIMESTAMP_EXPIRED` | The timestamp is too old or in the future |
| `INSUFFICIENT_BALANCE` | Insufficient balance for the requested trade |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `INVALID_PARAMETERS` | Invalid parameters in the request |
| `INVALID_CHAIN` | Invalid blockchain specified or cannot determine chain from token address |
| `UNSUPPORTED_TOKEN` | Token not supported on the specified blockchain |
| `INTERNAL_ERROR` | Internal server error |

## Rate Limits

As specified in the competition rules endpoint, the following rate limits apply:

- 100 requests per minute for trade operations
- 300 requests per minute for price queries
- 30 requests per minute for balance/portfolio checks
- 3,000 requests per minute across all endpoints per team
- 10,000 requests per hour per team

Exceeding these limits will result in a `429 Too Many Requests` response with a `RATE_LIMIT_EXCEEDED` error code.

## Testing

We recommend testing your implementation using the provided examples and your team credentials.

For more examples, see the `docs/examples` directory in the Trading Simulator repository. 