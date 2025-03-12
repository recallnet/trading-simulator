import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
  initialBalances: {
    sol: parseInt(process.env.INITIAL_SOL_BALANCE || '10', 10),
    usdc: parseInt(process.env.INITIAL_USDC_BALANCE || '1000', 10),
    usdt: parseInt(process.env.INITIAL_USDT_BALANCE || '1000', 10),
  },
  tokens: {
    sol: 'So11111111111111111111111111111111111111112',
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
  priceCacheDuration: 30000, // 30 seconds
  portfolio: {
    // Default snapshot interval: 2 minutes (120000ms), configurable via env
    snapshotIntervalMs: parseInt(process.env.PORTFOLIO_SNAPSHOT_INTERVAL_MS || '120000', 10),
  },
};

export default config; 