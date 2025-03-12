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
```

### Security Notes

- Always keep your API secret secure and never expose it
- The timestamp must be within 5 minutes of the server time to prevent replay attacks
- Use HTTPS for all API requests in production environments

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
      "token": "USDC",
      "amount": 100000.00
    },
    {
      "token": "SOL",
      "amount": 50.0
    },
    {
      "token": "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
      "amount": 5.0
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
    "totalValueUSD": 125000.00,
    "positions": [
      {
        "token": "USDC",
        "amount": 100000.00,
        "valueUSD": 100000.00,
        "percentage": 80.0
      },
      {
        "token": "SOL",
        "amount": 50.0,
        "valueUSD": 25000.00,
        "percentage": 20.0
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

**Response Example:**
```json
{
  "success": true,
  "trades": [
    {
      "id": "t_12345",
      "fromToken": "USDC",
      "toToken": "SOL",
      "fromAmount": 1000.00,
      "toAmount": 5.0,
      "priceAtExecution": 200.00,
      "timestamp": "2025-03-11T21:54:54.386Z",
      "slippage": 0.05
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### Price Information

#### Get Current Price

Returns the current price for a specific token.

- **URL:** `/api/price/current`
- **Method:** `GET`
- **Query Parameters:** `token` (required, e.g., "SOL")
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "price": {
    "token": "SOL",
    "usdPrice": 123.45,
    "timestamp": "2025-03-11T21:54:54.386Z",
    "source": "jupiter"
  }
}
```

#### Get Price History

Returns historical price data for a specific token.

- **URL:** `/api/price/history`
- **Method:** `GET`
- **Query Parameters:** 
  - `token` (required, e.g., "SOL")
  - `startTime` (optional, ISO timestamp)
  - `endTime` (optional, ISO timestamp)
  - `interval` (optional, "1m", "5m", "15m", "1h", "4h", "1d")
- **Authentication:** Required

**Response Example:**
```json
{
  "success": true,
  "priceHistory": [
    {
      "token": "SOL",
      "usdPrice": 123.45,
      "timestamp": "2025-03-11T21:00:00.000Z"
    },
    {
      "token": "SOL",
      "usdPrice": 124.50,
      "timestamp": "2025-03-11T22:00:00.000Z"
    }
  ]
}
```

### Trading

#### Execute Trade

Executes a trade between two tokens.

- **URL:** `/api/trade/execute`
- **Method:** `POST`
- **Authentication:** Required
- **Request Body:**
```json
{
  "fromToken": "USDC",
  "toToken": "SOL",
  "amount": 1000.00,
  "slippageTolerance": 0.5
}
```

**Response Example:**
```json
{
  "success": true,
  "trade": {
    "id": "t_12345",
    "fromToken": "USDC",
    "toToken": "SOL",
    "fromAmount": 1000.00,
    "toAmount": 4.975,
    "priceAtExecution": 200.00,
    "timestamp": "2025-03-11T21:54:54.386Z",
    "slippage": 0.5
  },
  "balances": {
    "USDC": 99000.00,
    "SOL": 54.975
  }
}
```

#### Get Quote

Returns a quote for a potential trade.

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
    "fromToken": "USDC",
    "toToken": "SOL",
    "fromAmount": 1000.00,
    "estimatedToAmount": 4.975,
    "estimatedPriceImpact": 0.5,
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
      "portfolioValue": 120345.67,
      "percentageGain": 20.34
    },
    {
      "rank": 2,
      "teamName": "Beta Investment",
      "portfolioValue": 115678.90,
      "percentageGain": 15.68
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
      "Initial balance is 10 SOL, 1000 USDC, 1000 USDT",
      "Trading is allowed 24/7 during the competition period",
      "Maximum single trade: 25% of team's total portfolio value"
    ],
    "rateLimits": {
      "tradeRequestsPerMinute": 100,
      "priceRequestsPerMinute": 300,
      "accountRequestsPerMinute": 30,
      "totalRequestsPerMinute": 3000,
      "totalRequestsPerHour": 10000
    },
    "slippageFormula": "baseSlippage = (tradeAmountUSD / 10000) * 0.5%, actualSlippage = baseSlippage * (0.8 + (Math.random() * 0.4))"
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