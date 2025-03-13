# Trading Simulator API Examples

This directory contains TypeScript examples to help you get started with the Trading Simulator API.

## Files in this Directory

- `api-client.ts` - A reusable client class for the Trading Simulator API
- `get-balances-example.ts` - Example of how to get account balances
- `execute-trade-example.ts` - Example of how to execute a trade
- `multi-chain-examples.ts` - Examples of cross-chain functionality

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

For the `execute-trade-example.ts`, you can specify the blockchain to use:

```bash
# Execute a Solana trade (default)
npx ts-node execute-trade-example.ts solana

# Execute an Ethereum trade
npx ts-node execute-trade-example.ts ethereum

# Execute a cross-chain trade
npx ts-node execute-trade-example.ts cross-chain
```

## Multi-Chain Support

The Trading Simulator now supports tokens on multiple blockchains:

- **Solana Virtual Machine (SVM)** - For Solana tokens
- **Ethereum Virtual Machine (EVM)** - For Ethereum tokens

### Common Token Addresses

#### Solana (SVM)
- SOL: `So11111111111111111111111111111111111111112`
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

#### Ethereum (EVM)
- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

### Chain Detection

The system automatically detects which blockchain a token belongs to based on its address format:
- Ethereum addresses start with '0x' followed by 40 hex characters
- Solana addresses are Base58 encoded strings (typically around 44 characters)

All price-related API responses include a `chain` field indicating which blockchain the token is on (`svm` or `evm`).

## Creating Your Own Integration

There are two approaches to integrating with the Trading Simulator API:

### 1. Using the Client Class

The `api-client.ts` file contains a reusable `TradingSimulatorClient` class that handles all the authentication and request logic for you. This is recommended for most teams.

```typescript
import { TradingSimulatorClient, BlockchainType, COMMON_TOKENS } from './api-client';

// Create a client instance
const client = new TradingSimulatorClient(
  'your-api-key',
  'your-api-secret',
  'http://localhost:3001' // Use the correct API URL
);

// Get balances (shows tokens across all chains)
const balances = await client.getBalances();
console.log('Balances:', balances);

// Get price for SOL (Solana)
const solPrice = await client.getPrice(COMMON_TOKENS.SVM.SOL);
console.log('SOL Price:', solPrice);

// Get price for ETH (Ethereum)
const ethPrice = await client.getPrice(COMMON_TOKENS.EVM.ETH);
console.log('ETH Price:', ethPrice);

// Execute a trade to buy SOL on Solana
const solTrade = await client.executeTrade({
  tokenAddress: COMMON_TOKENS.SVM.SOL,
  side: 'buy',
  amount: '100.00', // Use strings for amounts
  price: '125.45'   // Optional price limit
});
console.log('SOL Trade Result:', solTrade);

// Execute a trade to buy ETH on Ethereum
const ethTrade = await client.executeTrade({
  tokenAddress: COMMON_TOKENS.EVM.ETH,
  side: 'buy',
  amount: '100.00',
  price: '3500.00'
});
console.log('ETH Trade Result:', ethTrade);

// Execute a cross-chain trade (Solana USDC to Ethereum ETH)
const crossChainTrade = await client.executeCrossChainTrade({
  fromToken: COMMON_TOKENS.SVM.USDC,
  toToken: COMMON_TOKENS.EVM.ETH,
  amount: '100.00',
  price: '3500.00',
  slippageTolerance: '0.5'
});
console.log('Cross-Chain Trade Result:', crossChainTrade);

// Get trade history filtered by chain
const solTrades = await client.getTrades({ chain: BlockchainType.SVM });
console.log('Solana Trade History:', solTrades);
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

## Cross-Chain Trading

The Trading Simulator supports trading between tokens on different blockchains:

1. From Solana to Ethereum (e.g., Solana USDC to Ethereum ETH)
2. From Ethereum to Solana (e.g., Ethereum USDC to Solana SOL)

When executing a cross-chain trade, the system automatically:
1. Detects the blockchain for each token
2. Handles the conversion between chains
3. Returns transaction details with `fromChain` and `toChain` fields

See `execute-trade-example.ts` for examples of cross-chain trading.

## Further Documentation

For comprehensive API documentation, see the main [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) file. 