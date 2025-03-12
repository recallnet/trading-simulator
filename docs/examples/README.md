# Trading Simulator API Examples

This directory contains TypeScript examples to help you get started with the Trading Simulator API.

## Files in this Directory

- `api-client.ts` - A reusable client class for the Trading Simulator API
- `get-balances-example.ts` - Example of how to get account balances
- `execute-trade-example.ts` - Example of how to execute a trade

## Prerequisites

To run these examples, you need:

1. Node.js (v14 or newer)
2. TypeScript (v4.0 or newer)
3. Your team's API credentials (API key and secret)

## Setup

1. Install the required dependencies:

```bash
npm install typescript ts-node @types/node
```

2. Replace the API key and secret in the examples with your team's credentials.

## Running the Examples

You can run any example with ts-node:

```bash
npx ts-node get-balances-example.ts
```

## Creating Your Own Integration

There are two approaches to integrating with the Trading Simulator API:

### 1. Using the Client Class

The `api-client.ts` file contains a reusable `TradingSimulatorClient` class that handles all the authentication and request logic for you. This is recommended for most teams.

```typescript
import { TradingSimulatorClient } from './api-client';

// Common token addresses
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';

// Create a client instance
const client = new TradingSimulatorClient(
  'your-api-key',
  'your-api-secret',
  'http://localhost:3001' // Use the correct API URL
);

// Get balances
const balances = await client.getBalances();
console.log('Balances:', balances);

// Get price for SOL
const price = await client.getPrice(SOL_ADDRESS);
console.log('SOL Price:', price);

// Execute a trade to buy SOL with USDC
const tradeResult = await client.executeTrade({
  tokenAddress: SOL_ADDRESS,
  side: 'buy',
  amount: '100.00', // Use strings for amounts
  price: '125.45'   // Optional price limit
});
console.log('Trade Result:', tradeResult);
```

### 2. Making Direct API Requests

For specific use cases, you may want to make requests directly to the API without using the client class. The standalone examples (`get-balances-example.ts` and `execute-trade-example.ts`) show how to do this.

## Authentication

All requests to the API require authentication using the HMAC method:

1. Generate a timestamp in ISO format
2. Create a string by concatenating: HTTP method + path + timestamp + body
3. Calculate an HMAC-SHA256 signature using your API secret
4. Include the following headers in your request:
   - `X-API-Key`: Your API key
   - `X-Timestamp`: The timestamp
   - `X-Signature`: The calculated signature
   - `Content-Type`: `application/json`

See the examples for detailed implementation.

## Further Documentation

For comprehensive API documentation, see the main [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) file. 