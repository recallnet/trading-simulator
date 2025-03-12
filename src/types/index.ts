/**
 * Token information interface
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  price?: number;
  lastUpdated?: Date;
}

/**
 * Balance interface
 */
export interface Balance {
  token: string; // Token address
  amount: number;
}

/**
 * Trade interface
 */
export interface Trade {
  id: string;
  timestamp: Date;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  success: boolean;
  teamId: string;
  competitionId: string;
  error?: string;
}

/**
 * Price source interface for different providers
 */
export interface PriceSource {
  getName(): string;
  getPrice(tokenAddress: string): Promise<number | null>;
  supports(tokenAddress: string): Promise<boolean>;
}

/**
 * Trade result interface
 */
export interface TradeResult {
  success: boolean;
  error?: string;
  trade?: Trade;
}

/**
 * Account state interface
 */
export interface AccountState {
  balances: Map<string, number>;
  trades: Trade[];
}

/**
 * Team interface
 */
export interface Team {
  id: string;
  name: string;
  email: string;
  contactPerson: string;
  apiKey: string;
  apiSecret: string;
  apiSecretRaw?: string;  // Raw API secret for HMAC validation
  isAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Competition interface
 */
export interface Competition {
  id: string;
  name: string;
  description?: string;
  startDate: Date | null;
  endDate: Date | null;
  status: CompetitionStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Competition status enum
 */
export enum CompetitionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}

/**
 * Team's portfolio value
 */
export interface PortfolioValue {
  teamId: string;
  competitionId: string;
  timestamp: Date;
  totalValue: number;
  valuesByToken: Record<string, { amount: number; valueUsd: number }>;
}

/**
 * API Key authentication information
 */
export interface ApiAuth {
  teamId: string;
  key: string;
  secret: string;
} 