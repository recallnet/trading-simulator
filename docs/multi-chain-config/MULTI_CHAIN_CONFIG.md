# Multi-Chain Configuration Guide

This guide explains how to configure the Trading Simulator for multi-chain support, focusing on initial balance configuration for both Solana and Ethereum tokens, as well as specific EVM chain configurations.

## Initial Balance Configuration

The Trading Simulator supports setting initial balances for tokens on multiple blockchains. These balances are assigned to teams when they are created or when their balances are reset.

### Environment Variables

You can configure initial balances by setting the following environment variables in your `.env` file:

#### Solana (SVM) Token Balances

```
# Solana Virtual Machine (SVM) Balances
INITIAL_SVM_SOL_BALANCE=0       # Initial SOL balance
INITIAL_SVM_USDC_BALANCE=10000  # Initial USDC balance on Solana
INITIAL_SVM_USDT_BALANCE=0      # Initial USDT balance on Solana
```

#### Ethereum (EVM) Token Balances - General

```
# Ethereum Virtual Machine (EVM) Balances - General (used as fallback)
INITIAL_EVM_ETH_BALANCE=0       # Initial ETH balance
INITIAL_EVM_USDC_BALANCE=1000   # Initial USDC balance on Ethereum
INITIAL_EVM_USDT_BALANCE=0      # Initial USDT balance on Ethereum
```

#### Specific EVM Chain Balances

You can configure balances for specific EVM chains:

```
# Ethereum Mainnet Specific Balances
INITIAL_ETH_ETH_BALANCE=1       # Initial ETH balance on Ethereum Mainnet
INITIAL_ETH_USDC_BALANCE=1000   # Initial USDC balance on Ethereum Mainnet
INITIAL_ETH_USDT_BALANCE=0      # Initial USDT balance on Ethereum Mainnet

# Polygon Specific Balances
INITIAL_POLYGON_ETH_BALANCE=10  # Initial ETH balance on Polygon
INITIAL_POLYGON_USDC_BALANCE=1000 # Initial USDC balance on Polygon
INITIAL_POLYGON_USDT_BALANCE=0    # Initial USDT balance on Polygon

# Base Specific Balances
INITIAL_BASE_ETH_BALANCE=1        # Initial ETH balance on Base
INITIAL_BASE_USDC_BALANCE=1000    # Initial USDC balance on Base
INITIAL_BASE_USDT_BALANCE=0       # Initial USDT balance on Base
```

#### EVM Chain Priority Configuration

You can configure which EVM chains to query and in what order:

```
# Comma-separated list of EVM chains to query in order of priority
# Available chains: eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle
EVM_CHAINS=eth,polygon,base,arbitrum,optimism,bsc,avalanche,linea
```

If not specified, the system will use a default priority list.

### Adding New Tokens

To add support for a new token:

1. Add the token to the `blockchainTokens` configuration in `src/config/index.ts` for general blockchain types:

```typescript
blockchainTokens: {
  [BlockchainType.SVM]: {
    sol: 'So11111111111111111111111111111111111111112',
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    // Add your new Solana token here
    bonk: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
  },
  [BlockchainType.EVM]: {
    eth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    // Add your new Ethereum token here
    link: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
  }
}
```

2. Add the token to the `specificChainTokens` configuration for specific chains:

```typescript
specificChainTokens: {
  eth: {
    eth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
    // Add your new Ethereum Mainnet token here
    link: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
  },
  polygon: {
    matic: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
    usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
    // Add your new Polygon token here
    link: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39'
  },
  // Add other chains as needed
}
```

3. Add the corresponding environment variables for the initial balances:

```
# General token balances
INITIAL_SVM_BONK_BALANCE=1000000
INITIAL_EVM_LINK_BALANCE=50

# Specific chain token balances
INITIAL_ETH_LINK_BALANCE=50
INITIAL_POLYGON_LINK_BALANCE=100
```

4. Update the `multiChainInitialBalances` configuration for general blockchain types:

```typescript
multiChainInitialBalances: {
  [BlockchainType.SVM]: {
    sol: parseInt(process.env.INITIAL_SVM_SOL_BALANCE || '0', 10),
    usdc: parseInt(process.env.INITIAL_SVM_USDC_BALANCE || '0', 10),
    usdt: parseInt(process.env.INITIAL_SVM_USDT_BALANCE || '0', 10),
    // Add your new Solana token initial balance
    bonk: parseInt(process.env.INITIAL_SVM_BONK_BALANCE || '0', 10)
  },
  [BlockchainType.EVM]: {
    eth: parseInt(process.env.INITIAL_EVM_ETH_BALANCE || '0', 10),
    usdc: parseInt(process.env.INITIAL_EVM_USDC_BALANCE || '0', 10),
    usdt: parseInt(process.env.INITIAL_EVM_USDT_BALANCE || '0', 10),
    // Add your new Ethereum token initial balance
    link: parseInt(process.env.INITIAL_EVM_LINK_BALANCE || '0', 10)
  }
}
```

5. Update the `getSpecificChainBalances` function to include your new tokens:

```typescript
// Helper function to parse specific chain initial balance environment variables
const getSpecificChainBalances = (): Record<SpecificChain, Record<string, number>> => {
  const result: Partial<Record<SpecificChain, Record<string, number>>> = {};

  // Ethereum Mainnet
  if (
    process.env.INITIAL_ETH_ETH_BALANCE ||
    process.env.INITIAL_ETH_USDC_BALANCE ||
    process.env.INITIAL_ETH_USDT_BALANCE ||
    process.env.INITIAL_ETH_LINK_BALANCE
  ) {
    result.eth = {
      eth: parseInt(
        process.env.INITIAL_ETH_ETH_BALANCE || process.env.INITIAL_EVM_ETH_BALANCE || '0',
        10,
      ),
      usdc: parseInt(
        process.env.INITIAL_ETH_USDC_BALANCE || process.env.INITIAL_EVM_USDC_BALANCE || '0',
        10,
      ),
      usdt: parseInt(
        process.env.INITIAL_ETH_USDT_BALANCE || process.env.INITIAL_EVM_USDT_BALANCE || '0',
        10,
      ),
      link: parseInt(
        process.env.INITIAL_ETH_LINK_BALANCE || process.env.INITIAL_EVM_LINK_BALANCE || '0',
        10,
      ),
    };
  }

  // Polygon
  if (
    process.env.INITIAL_POLYGON_MATIC_BALANCE ||
    process.env.INITIAL_POLYGON_USDC_BALANCE ||
    process.env.INITIAL_POLYGON_LINK_BALANCE
  ) {
    result.polygon = {
      matic: parseInt(process.env.INITIAL_POLYGON_ETH_BALANCE || '0', 10),
      usdc: parseInt(
        process.env.INITIAL_POLYGON_USDC_BALANCE || process.env.INITIAL_EVM_USDC_BALANCE || '0',
        10,
      ),
      usdt: parseInt(
        process.env.INITIAL_POLYGON_USDT_BALANCE || process.env.INITIAL_EVM_USDT_BALANCE || '0',
        10,
      ),
      link: parseInt(
        process.env.INITIAL_POLYGON_LINK_BALANCE || process.env.INITIAL_EVM_LINK_BALANCE || '0',
        10,
      ),
    };
  }

  // Add SVM (Solana) balances
  result.svm = {
    sol: parseInt(process.env.INITIAL_SVM_SOL_BALANCE || '0', 10),
    usdc: parseInt(process.env.INITIAL_SVM_USDC_BALANCE || '0', 10),
    usdt: parseInt(process.env.INITIAL_SVM_USDT_BALANCE || '0', 10),
    // Add new token balances as needed
  };

  // Add other chains as needed

  return result as Record<SpecificChain, Record<string, number>>;
};
```

## How It Works

### Initial Balances

When a team is created or their balances are reset, the `BalanceManager` service:

1. Reads the configured initial balances for each blockchain (SVM and EVM)
2. Iterates through each token defined in the configuration
3. Sets the initial balance for each token with a non-zero configured amount
4. Stores these balances in the database

### Multi-Chain Price Fetching

The system supports fetching token prices from multiple EVM chains:

1. The `MultiChainProvider` attempts to fetch token prices from different EVM chains based on the configured priority.
2. The `PriceTracker` service uses the `MultiChainProvider` to fetch prices for EVM tokens.
3. When a price is successfully fetched, the system stores both the general chain type (`EVM`) and the specific chain (e.g., `eth`, `polygon`) in the database.
4. The API returns both the general chain type and the specific chain in the response, allowing clients to display detailed chain information.

### Chain Priority

The system uses the following process to determine which chains to query:

1. It reads the `EVM_CHAINS` environment variable, which contains a comma-separated list of chains.
2. If the variable is not set, it uses a default priority list: `eth,polygon,bsc,arbitrum,base,optimism,avalanche,linea`.
3. The `MultiChainProvider` attempts to fetch prices from each chain in the specified order until it finds a valid price.
4. This approach ensures that the system can fall back to alternative chains if a price is not available on the preferred chain.

This approach ensures that teams start with the appropriate balances for tokens on both blockchains, enabling them to trade across chains using the multi-chain support provided by the DexScreener integration.
