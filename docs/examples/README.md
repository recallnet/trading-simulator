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

To run the multi-chain examples, including the new chain override feature:

```bash
npx ts-node multi-chain-examples.ts
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
- LINK: `0x514910771af9ca656af840dff83e8264ecf986ca`
- ARB: `0x912CE59144191C1204E64559FE8253a0e49E6548`
- TOSHI: `0x532f27101965dd16442E59d40670FaF5eBB142E4`

### Chain Detection

The system automatically detects which blockchain a token belongs to based on its address format:
- Ethereum addresses start with '0x' followed by 40 hex characters
- Solana addresses are Base58 encoded strings (typically around 44 characters)

All price-related API responses include a `chain` field indicating which blockchain the token is on (`svm` or `evm`).

### Chain Override Feature

For EVM tokens, the system needs to determine which specific chain the token exists on (Ethereum, Polygon, Base, etc.). By default, this requires checking multiple chains, which can take 1-3 seconds. 

The new chain override feature allows you to specify the exact chain for a token, significantly improving API response times:

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
// Get price for Chainlink (LINK) token WITH chain override
const linkPriceWithOverride = await client.getPrice(
  COMMON_TOKENS.EVM.LINK,
  BlockchainType.EVM,
  SpecificChain.ETH  // Specifying exact chain (Ethereum)
);
console.log(`LINK Price with override: $${linkPriceWithOverride.price}`);
console.log(`Response time: much faster (typically 50-100ms)`);

// Get price for Arbitrum (ARB) token WITH chain override
const arbPriceWithOverride = await client.getPrice(
  COMMON_TOKENS.EVM.ARB,
  BlockchainType.EVM,
  SpecificChain.ARBITRUM  // Specifying exact chain (Arbitrum)
);
console.log(`ARB Price with override: $${arbPriceWithOverride.price}`);
```

#### Performance Comparison

The `multi-chain-examples.ts` file includes examples that demonstrate the performance difference with and without chain override:

```typescript
// Example from multi-chain-examples.ts

// WITHOUT chain override (slower)
const startTime1 = Date.now();
const priceNoOverride = await client.getPrice(token.address, BlockchainType.EVM);
const duration1 = Date.now() - startTime1;
console.log(`Time taken without override: ${duration1}ms`);

// WITH chain override (faster)
const startTime2 = Date.now();
const priceWithOverride = await client.getPrice(
  token.address, 
  BlockchainType.EVM,
  token.chain
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
import { TradingSimulatorClient, BlockchainType, SpecificChain, COMMON_TOKENS, TOKEN_CHAINS } from './api-client';

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

// Get price for LINK (Ethereum) with chain override for better performance
const linkPrice = await client.getPrice(
  COMMON_TOKENS.EVM.LINK,
  BlockchainType.EVM,
  SpecificChain.ETH
);
console.log('LINK Price (with chain override):', linkPrice);

// Execute a trade to buy SOL on Solana
const solTrade = await client.executeTrade({
  fromToken: COMMON_TOKENS.SVM.USDC,
  toToken: COMMON_TOKENS.SVM.SOL,
  amount: '100.00', // Use strings for amounts
  fromChain: BlockchainType.SVM,
  toChain: BlockchainType.SVM
});
console.log('SOL Trade Result:', solTrade);

// Execute a trade to buy ETH on Ethereum
const ethTrade = await client.executeTrade({
  fromToken: COMMON_TOKENS.EVM.USDC,
  toToken: COMMON_TOKENS.EVM.ETH,
  amount: '100.00',
  fromChain: BlockchainType.EVM,
  toChain: BlockchainType.EVM,
  fromSpecificChain: SpecificChain.ETH,
  toSpecificChain: SpecificChain.ETH
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