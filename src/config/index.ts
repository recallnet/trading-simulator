import dotenv from 'dotenv';
import path from 'path';
import { BlockchainType, SpecificChain } from '../types';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Helper function to parse specific chain initial balance environment variables
const getSpecificChainBalances = (): Record<SpecificChain, Record<string, number>> => {
  const result: Partial<Record<SpecificChain, Record<string, number>>> = {};
  
  // Ethereum Mainnet
  if (process.env.INITIAL_ETH_ETH_BALANCE || process.env.INITIAL_ETH_USDC_BALANCE || process.env.INITIAL_ETH_USDT_BALANCE) {
    result.eth = {
      eth: parseInt(process.env.INITIAL_ETH_ETH_BALANCE || process.env.INITIAL_EVM_ETH_BALANCE || '0', 10),
      usdc: parseInt(process.env.INITIAL_ETH_USDC_BALANCE || process.env.INITIAL_EVM_USDC_BALANCE || '1000', 10),
      usdt: parseInt(process.env.INITIAL_ETH_USDT_BALANCE || process.env.INITIAL_EVM_USDT_BALANCE || '0', 10),
    };
  }
  
  // Polygon
  if (process.env.INITIAL_POLYGON_MATIC_BALANCE || process.env.INITIAL_POLYGON_USDC_BALANCE) {
    result.polygon = {
      matic: parseInt(process.env.INITIAL_POLYGON_MATIC_BALANCE || '0', 10),
      usdc: parseInt(process.env.INITIAL_POLYGON_USDC_BALANCE || process.env.INITIAL_EVM_USDC_BALANCE || '1000', 10),
      usdt: parseInt(process.env.INITIAL_POLYGON_USDT_BALANCE || process.env.INITIAL_EVM_USDT_BALANCE || '0', 10),
    };
  }
  
  // Base
  if (process.env.INITIAL_BASE_ETH_BALANCE || process.env.INITIAL_BASE_USDC_BALANCE) {
    result.base = {
      eth: parseInt(process.env.INITIAL_BASE_ETH_BALANCE || process.env.INITIAL_EVM_ETH_BALANCE || '0', 10),
      usdc: parseInt(process.env.INITIAL_BASE_USDC_BALANCE || process.env.INITIAL_EVM_USDC_BALANCE || '1000', 10),
      usdt: parseInt(process.env.INITIAL_BASE_USDT_BALANCE || process.env.INITIAL_EVM_USDT_BALANCE || '0', 10),
    };
  }
  
  // Solana (for consistency)
  result.svm = {
    sol: parseInt(process.env.INITIAL_SVM_SOL_BALANCE || process.env.INITIAL_SOL_BALANCE || '0', 10),
    usdc: parseInt(process.env.INITIAL_SVM_USDC_BALANCE || process.env.INITIAL_USDC_BALANCE || '10000', 10),
    usdt: parseInt(process.env.INITIAL_SVM_USDT_BALANCE || process.env.INITIAL_USDT_BALANCE || '0', 10),
  };
  
  return result as Record<SpecificChain, Record<string, number>>;
};

// Parse EVM chains configuration
const parseEvmChains = (): SpecificChain[] => {
  const defaultChains: SpecificChain[] = ['eth', 'polygon', 'bsc', 'arbitrum', 'base', 'optimism', 'avalanche', 'linea'];
  
  if (!process.env.EVM_CHAINS) {
    return defaultChains;
  }
  
  const configuredChains = process.env.EVM_CHAINS.split(',')
    .map(chain => chain.trim().toLowerCase())
    .filter(chain => ['eth', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'base', 'linea', 'zksync', 'scroll', 'mantle'].includes(chain)) as SpecificChain[];
  
  if (configuredChains.length === 0) {
    return defaultChains;
  }
  
  return configuredChains;
};

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'solana_trading_simulator',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_do_not_use_in_production',
    apiKeySecret: process.env.API_KEY_SECRET || 'default_api_key_secret_do_not_use_in_production',
    hmacSecret: process.env.HMAC_SECRET || 'default_hmac_secret_do_not_use_in_production',
    masterEncryptionKey: process.env.MASTER_ENCRYPTION_KEY || 'default_encryption_key_do_not_use_in_production',
  },
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  // Legacy initial balances (for backward compatibility)
  initialBalances: {
    sol: parseInt(process.env.INITIAL_SOL_BALANCE || '0', 10),
    usdc: parseInt(process.env.INITIAL_USDC_BALANCE || '10000', 10),
    usdt: parseInt(process.env.INITIAL_USDT_BALANCE || '0', 10),
  },
  // Multi-chain initial balances - general chain types
  multiChainInitialBalances: {
    [BlockchainType.SVM]: {
      sol: parseInt(process.env.INITIAL_SVM_SOL_BALANCE || process.env.INITIAL_SOL_BALANCE || '0', 10),
      usdc: parseInt(process.env.INITIAL_SVM_USDC_BALANCE || process.env.INITIAL_USDC_BALANCE || '10000', 10),
      usdt: parseInt(process.env.INITIAL_SVM_USDT_BALANCE || process.env.INITIAL_USDT_BALANCE || '0', 10),
    },
    [BlockchainType.EVM]: {
      eth: parseInt(process.env.INITIAL_EVM_ETH_BALANCE || '0', 10),
      usdc: parseInt(process.env.INITIAL_EVM_USDC_BALANCE || '1000', 10),
      usdt: parseInt(process.env.INITIAL_EVM_USDT_BALANCE || '0', 10),
    }
  },
  // Specific chain initial balances
  specificChainBalances: getSpecificChainBalances(),
  tokens: {
    sol: 'So11111111111111111111111111111111111111112',
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
  // Multi-chain token configuration
  blockchainTokens: {
    [BlockchainType.SVM]: {
      sol: 'So11111111111111111111111111111111111111112',
      usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    },
    [BlockchainType.EVM]: {
      eth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    }
  },
  // Specific chain token addresses
  specificChainTokens: {
    eth: {
      eth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7'  // USDT on Ethereum
    },
    polygon: {
      matic: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
      usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
      usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'  // USDT on Polygon
    },
    base: {
      eth: '0x4200000000000000000000000000000000000006', // WETH on Base 
      usdc: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // USDbC on Base
      usdt: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'  // USDT on Base
    },
    svm: {
      sol: 'So11111111111111111111111111111111111111112',
      usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    }
  },
  // EVM chain configuration
  evmChains: parseEvmChains(),
  api: {
    noves: {
      apiKey: process.env.NOVES_API_KEY || '',
      enabled: !!process.env.NOVES_API_KEY,
    },
  },
  priceCacheDuration: parseInt(process.env.PRICE_CACHE_MS || '30000', 10), // 30 seconds
  portfolio: {
    // Default snapshot interval: 2 minutes (120000ms), configurable via env
    snapshotIntervalMs: parseInt(process.env.PORTFOLIO_SNAPSHOT_INTERVAL_MS || '120000', 10),
  },
};

export default config; 