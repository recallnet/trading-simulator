# Trading Simulator API Examples

This directory contains TypeScript examples to help you get started with the Trading Simulator API.

## Files in this Directory

- `api-client.ts` - A reusable client class for the Trading Simulator API
- `get-balances-example.ts` - Example of how to get account balances
- `execute-trade-example.ts` - Example of how to execute a trade
- `multi-chain-examples.ts` - Examples of chain-specific functionality

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
# Execute a Base chain trade (default)
npx ts-node execute-trade-example.ts base

# Execute an Ethereum trade
npx ts-node execute-trade-example.ts ethereum

# Execute a Solana trade
npx ts-node execute-trade-example.ts solana
```

To run the multi-chain examples, including the chain override feature:

```bash
npx ts-node multi-chain-examples.ts
```

## Multi-Chain Support

The Trading Simulator supports tokens on multiple blockchains:

- **Solana Virtual Machine (SVM)** - For Solana tokens
- **Ethereum Virtual Machine (EVM)** - For Ethereum, Base, Polygon, and other EVM chains

### Common Token Addresses

#### Base Chain (EVM)
- ETH: `0x4200000000000000000000000000000000000006`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- TOSHI: `0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b`

#### Ethereum (EVM)
- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- LINK: `0x514910771af9ca656af840dff83e8264ecf986ca`

#### Solana (SVM)
- SOL: `So11111111111111111111111111111111111111112`
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

### Chain Detection

The system automatically detects which blockchain a token belongs to based on its address format:
- Ethereum addresses start with '0x' followed by 40 hex characters
- Solana addresses are Base58 encoded strings (typically around 44 characters)

All price-related API responses include a `chain` field indicating which blockchain the token is on (`svm` or `evm`).

### Chain Override Feature

For EVM tokens, the system needs to determine which specific chain the token exists on (Ethereum, Polygon, Base, etc.). By default, this requires checking multiple chains, which can take 1-3 seconds. 

The chain override feature allows you to specify the exact chain for a token, significantly improving API response times:

- **Without chain override**: 1-3 seconds (checking multiple chains)
- **With chain override**: 50-100ms (direct API call to specified chain)

#### Supported Chains

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

#### Using Chain Override

```typescript
// Get price for USDC on Base WITH chain override (fast)
const usdcPriceWithOverride = await client.getPrice(
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  BlockchainType.EVM,
  SpecificChain.BASE  // Specifying exact chain (Base)
);
console.log(`USDC Price with override: $${usdcPriceWithOverride.price}`);
console.log(`Response time: much faster (typically 50-100ms)`);

// Execute a trade on Base with chain override (fast)
const tradeResult = await client.executeTrade({
  fromToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  toToken: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", // TOSHI on Base
  amount: "50",
  fromChain: BlockchainType.EVM,
  toChain: BlockchainType.EVM,
  fromSpecificChain: SpecificChain.BASE,  // Specifying exact chain (Base)
  toSpecificChain: SpecificChain.BASE     // Specifying exact chain (Base)
});
```

#### Performance Comparison

The `multi-chain-examples.ts` file includes examples that demonstrate the performance difference with and without chain override:

```typescript
// Example from multi-chain-examples.ts

// WITHOUT chain override (slower)
const startTime1 = Date.now();
const priceNoOverride = await client.getPrice(
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  BlockchainType.EVM
);
const duration1 = Date.now() - startTime1;
console.log(`Time taken without override: ${duration1}ms`);

// WITH chain override (faster)
const startTime2 = Date.now();
const priceWithOverride = await client.getPrice(
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  BlockchainType.EVM,
  SpecificChain.BASE
);
const duration2 = Date.now() - startTime2;
console.log(`Time taken with override: ${duration2}ms`);

// Calculate improvement
const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(2);
console.log(`Performance improvement: ${improvement}% faster`);
```

#### When to Use Chain Override

Use chain override when:
1. You already know which specific chain a token is on
2. You need the fastest possible response times 
3. You're making multiple requests for the same token

For best results, maintain a mapping of tokens to their specific chains in your application, as demonstrated by the `TOKEN_CHAINS` map in the examples.

## Creating Your Own Integration

There are two approaches to integrating with the Trading Simulator API:

### 1. Using the Client Class

The `api-client.ts` file contains a reusable `TradingSimulatorClient` class that handles all the authentication and request logic for you. This is recommended for most teams.

```typescript
import { TradingSimulatorClient, BlockchainType, SpecificChain, COMMON_TOKENS } from './api-client';

// Create a client instance
const client = new TradingSimulatorClient(
  'your-api-key',
  'your-api-secret',
  'http://localhost:3001' // Use the correct API URL
);

// Get balances
const balances = await client.getBalances();
console.log('Balances:', balances);

// Execute a trade on Base chain
const baseTrade = await client.executeTrade({
  fromToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  toToken: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", // TOSHI on Base
  amount: "50.00", // Use strings for amounts
  fromChain: BlockchainType.EVM,
  toChain: BlockchainType.EVM,
  fromSpecificChain: SpecificChain.BASE,
  toSpecificChain: SpecificChain.BASE
});
console.log('Base Trade Result:', baseTrade);

// Get trade history
const trades = await client.getTrades();
console.log('Trade History:', trades);
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