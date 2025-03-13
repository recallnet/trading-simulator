# Noves Integration Plan

## Overview

This document outlines the integration plan for Noves as the primary price provider for our trading simulator application. Noves offers real-time and historical on-chain pricing across multiple blockchains, which will allow us to expand our platform to support both Solana Virtual Machine (SVM) and Ethereum Virtual Machine (EVM) tokens.

## Current Architecture

Our trading simulator currently uses the following price providers:
1. SolanaProvider - A basic provider with hardcoded prices for main Solana tokens
2. JupiterProvider - Uses Jupiter's API to fetch Solana token prices
3. RaydiumProvider - Uses Raydium's API for Solana token prices
4. SerumProvider - Uses Serum's API for Solana token prices

All providers implement the `PriceSource` interface:

```typescript
export interface PriceSource {
  getName(): string;
  getPrice(tokenAddress: string): Promise<number | null>;
  supports(tokenAddress: string): Promise<boolean>;
}
```

## Noves API Overview

Noves provides a comprehensive pricing API that supports:
- Cross-chain token pricing (30+ chains including Solana and Ethereum)
- Real-time and historical pricing
- Support for standard tokens and LP tokens
- High confidence level indicators
- Multiple pricing sources via 200+ DEXes

## Integration Requirements

1. API Key setup for Noves
2. Implementation of a new `NovesProvider` class
3. Updates to the configuration for multi-chain support
4. Extensions to the current types to support chain identification

## Implementation Plan

### 1. Create NovesProvider

Create a new provider in `/src/services/providers/noves.provider.ts` that implements the `PriceSource` interface with the following features:

- API authentication
- Request rate limiting
- Caching system for performance
- Error handling and retries
- Support for both SVM (Solana) and EVM (Ethereum) tokens
- Chain identification logic

### 2. Update Configuration

Extend the current configuration system to support:
- Noves API credentials
- Chain-specific configuration
- Token identification by chain

### 3. Create Chain Identification System

Implement a chain identification system that:
- Determines the chain for a given token address
- Routes pricing requests to appropriate endpoints
- Provides chain-specific formatting for addresses

### 4. Update Types

Extend the current types to support multi-chain functionality:

```typescript
export enum BlockchainType {
  SVM = 'svm',
  EVM = 'evm'
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  price?: number;
  lastUpdated?: Date;
  chain: BlockchainType; // New field
}

export interface ChainProvider {
  getChainId(): string;
  isValidAddress(address: string): boolean;
  formatAddress(address: string): string;
}
```

### 5. Provider Implementation Details

#### NovesProvider Class

```typescript
export class NovesProvider implements PriceSource {
  private readonly API_BASE = 'https://api.noves.fi/pricing';
  private cache: Map<string, { price: number; timestamp: number; chain: string }>;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  
  constructor(private apiKey: string) {
    this.cache = new Map();
  }

  getName(): string {
    return 'Noves';
  }

  async getPrice(tokenAddress: string, chain?: BlockchainType): Promise<number | null> {
    // Determine chain if not provided
    const tokenChain = chain || this.determineChain(tokenAddress);
    
    // Implementation details
    // ...
  }

  async supports(tokenAddress: string): Promise<boolean> {
    // Implementation details
    // ...
  }

  private determineChain(tokenAddress: string): BlockchainType {
    // Logic to determine if a token is SVM or EVM based on address format
    // ...
  }
}
```

## Integration Steps

1. **Install Dependencies**
   - Add any required packages for interacting with Noves API

2. **Create Provider**
   - Implement the `NovesProvider` class
   - Add chain detection logic
   - Implement caching and rate limiting

3. **Update Configuration**
   - Add Noves API credentials to environment variables
   - Update configuration files to support multi-chain setup

4. **Modify Existing Code**
   - Update token handling to include chain information
   - Extend the price service to route requests by chain

5. **Testing Plan**
   - Unit tests for the new provider
   - Integration tests with both SVM and EVM tokens
   - Performance tests for caching and rate limiting
   - Comparison tests against existing providers

## API Endpoints

Based on the available information, here are the expected Noves API endpoints:

```
GET /pricing/{chain}/token/{tokenAddress}  - Get current price for token
GET /pricing/{chain}/tokens  - Batch price request for multiple tokens
GET /pricing/{chain}/history/{tokenAddress}  - Get historical prices
```

Where `{chain}` would be:
- `svm` for Solana tokens
- `evm` for Ethereum tokens

## Timeline

1. **Phase 1: Setup & Research (1-2 days)**
   - Set up Noves API access
   - Test basic API connectivity
   - Document response formats

2. **Phase 2: Implementation (3-5 days)**
   - Implement `NovesProvider`
   - Add multi-chain support
   - Update configuration

3. **Phase 3: Testing (2-3 days)**
   - Test with various tokens on both chains
   - Verify price accuracy
   - Stress test with multiple requests

4. **Phase 4: Deployment (1 day)**
   - Deploy changes to production
   - Monitor performance
   - Configure as primary provider

## Future Considerations

1. **Additional Chains**
   - Extend beyond SVM and EVM to support other chains like Cosmos
   
2. **LP Token Support**
   - Add support for pricing LP tokens using Noves capabilities

3. **Historical Price Data**
   - Implement historical price tracking and comparison

4. **Price Alerts**
   - Create price alerts based on real-time data

## Conclusion

Integrating Noves as our primary price provider will significantly enhance our trading simulator's capabilities by enabling multi-chain support. This will allow users to trade and track assets across both Solana and Ethereum ecosystems, providing a more comprehensive trading experience. 