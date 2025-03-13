import * as crypto from 'crypto';

/**
 * Trading Simulator API Client
 * 
 * This example client demonstrates how to authenticate and make requests
 * to the Trading Simulator API using TypeScript.
 */

// Define blockchain types
export enum BlockchainType {
  SVM = 'svm', // Solana Virtual Machine
  EVM = 'evm'  // Ethereum Virtual Machine
}

// Common token addresses
export const COMMON_TOKENS = {
  // Solana tokens
  SVM: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    SOL: 'So11111111111111111111111111111111111111112'
  },
  // Ethereum tokens
  EVM: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
  }
};

export class TradingSimulatorClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  /**
   * Create a new instance of the Trading Simulator client
   * 
   * @param apiKey The API key for your team
   * @param apiSecret The API secret for your team
   * @param baseUrl The base URL of the Trading Simulator API (default: http://localhost:3001)
   */
  constructor(
    apiKey: string,
    apiSecret: string,
    baseUrl: string = 'http://localhost:3001'
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate the required headers for API authentication
   * 
   * @param method The HTTP method (GET, POST, etc.)
   * @param path The API endpoint path (e.g., /api/account/balances)
   * @param body The request body (if any)
   * @returns An object containing the required headers
   */
  private generateHeaders(method: string, path: string, body: string = ''): Record<string, string> {
    // Use timestamp 2 years in the future for e2e tests (to avoid expiration)
    // In production, use current timestamp: const timestamp = new Date().toISOString();
    const timestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const data = method + path + timestamp + body;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(data)
      .digest('hex');

    return {
      'X-API-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make a request to the API
   * 
   * @param method The HTTP method
   * @param path The API endpoint path
   * @param body The request body (if any)
   * @returns A promise that resolves to the API response
   */
  private async request<T>(method: string, path: string, body: any = null): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const bodyString = body ? JSON.stringify(body) : '';
    const headers = this.generateHeaders(method, path, bodyString);
    
    const options: RequestInit = {
      method,
      headers,
      body: bodyString || undefined
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'API request failed');
      }
      
      return data as T;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Detect blockchain type from token address format
   * 
   * @param token The token address
   * @returns The detected blockchain type (SVM or EVM)
   */
  public detectChain(token: string): BlockchainType {
    // Ethereum addresses start with '0x' followed by 40 hex characters
    if (/^0x[a-fA-F0-9]{40}$/.test(token)) {
      return BlockchainType.EVM;
    }
    // Solana addresses are base58 encoded, typically around 44 characters
    // This is a simplified detection, could be more robust
    return BlockchainType.SVM;
  }

  /**
   * Get the current balances for your team
   * 
   * @returns A promise that resolves to the balances response
   */
  async getBalances(): Promise<any> {
    return this.request<any>('GET', '/api/account/balances');
  }

  /**
   * Get the trade history for your team
   * 
   * @param options Optional filtering parameters
   * @returns A promise that resolves to the trade history response
   */
  async getTrades(options?: {
    limit?: number;
    offset?: number;
    token?: string;
    chain?: BlockchainType;
  }): Promise<any> {
    let query = '';
    
    if (options) {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.token) params.append('token', options.token);
      if (options.chain) params.append('chain', options.chain);
      query = `?${params.toString()}`;
    }
    
    return this.request<any>('GET', `/api/account/trades${query}`);
  }

  /**
   * Get the current price for a token
   * 
   * @param token The token address to get the price for
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @returns A promise that resolves to the price response
   */
  async getPrice(token: string, chain?: BlockchainType): Promise<any> {
    let query = `?token=${encodeURIComponent(token)}`;
    
    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }
    
    return this.request<any>('GET', `/api/price${query}`);
  }

  /**
   * Get a price from a specific provider
   * 
   * @param token The token address to get the price for
   * @param provider The provider name (e.g., "jupiter", "raydium", "serum", "noves")
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @returns A promise that resolves to the price response
   */
  async getPriceFromProvider(token: string, provider: string, chain?: BlockchainType): Promise<any> {
    let query = `?token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`;
    
    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }
    
    return this.request<any>('GET', `/api/price/provider${query}`);
  }

  /**
   * Execute a trade
   * 
   * @param params Trading parameters object
   * @returns A promise that resolves to the trade response
   */
  async executeTrade(params: {
    tokenAddress: string;
    side: 'buy' | 'sell';
    amount: string;
    price?: string;
    slippageTolerance?: string;
    usdcAddress?: string; // Optional USDC address to use (defaults to chain-specific USDC)
  }): Promise<any> {
    // Detect the chain based on token address format
    const chain = this.detectChain(params.tokenAddress);
    
    // Determine the appropriate USDC address based on the detected chain
    const USDC_ADDRESS = params.usdcAddress || 
      (chain === BlockchainType.EVM ? 
        COMMON_TOKENS.EVM.USDC : 
        COMMON_TOKENS.SVM.USDC);
    
    // Format parameters for API call
    // For buy orders, we're buying tokenAddress using USDC
    // For sell orders, we're selling tokenAddress to get USDC
    const fromToken = params.side === 'buy' ? USDC_ADDRESS : params.tokenAddress;
    const toToken = params.side === 'buy' ? params.tokenAddress : USDC_ADDRESS;
    
    return this.request<any>('POST', '/api/trade/execute', {
      fromToken,
      toToken,
      amount: params.amount,
      price: params.price,
      slippageTolerance: params.slippageTolerance
    });
  }

  /**
   * Execute a cross-chain trade (e.g., from Solana USDC to Ethereum ETH)
   * 
   * @param params Cross-chain trading parameters
   * @returns A promise that resolves to the trade response
   */
  async executeCrossChainTrade(params: {
    fromToken: string;
    toToken: string;
    amount: string;
    price?: string;
    slippageTolerance?: string;
  }): Promise<any> {
    return this.request<any>('POST', '/api/trade/execute', {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
      price: params.price,
      slippageTolerance: params.slippageTolerance
    });
  }

  /**
   * Get the status of the current competition
   * 
   * @returns A promise that resolves to the competition status response
   */
  async getCompetitionStatus(): Promise<any> {
    return this.request<any>('GET', '/api/competition/status');
  }

  /**
   * Get the leaderboard for the current competition
   * 
   * @returns A promise that resolves to the leaderboard response
   */
  async getLeaderboard(): Promise<any> {
    return this.request<any>('GET', '/api/competition/leaderboard');
  }

  /**
   * Get your team's profile information
   * 
   * @returns A promise that resolves to the team profile
   */
  async getProfile(): Promise<any> {
    return this.request<any>('GET', '/api/account/profile');
  }

  /**
   * Update your team's profile information
   * 
   * @param profileData Profile data to update
   * @returns A promise that resolves to the updated profile
   */
  async updateProfile(profileData: any): Promise<any> {
    return this.request<any>('PUT', '/api/account/profile', profileData);
  }
}

// Example usage
async function example() {
  const client = new TradingSimulatorClient(
    'your-api-key',
    'your-api-secret',
    'http://localhost:3001'
  );

  try {
    // Get balances (shows all tokens across all chains)
    const balances = await client.getBalances();
    console.log('Balances:', balances);

    // Get team profile
    const profile = await client.getProfile();
    console.log('Team Profile:', profile);

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
      amount: '10', // 10 USDC
      price: '1.0' // Optional
    });
    console.log('SOL Trade Result:', solTrade);

    // Execute a trade to buy ETH on Ethereum
    const ethTrade = await client.executeTrade({
      tokenAddress: COMMON_TOKENS.EVM.ETH,
      side: 'buy',
      amount: '10', // 10 USDC
      price: '3500.0' // Optional
    });
    console.log('ETH Trade Result:', ethTrade);

    // Execute a cross-chain trade (Solana USDC to Ethereum ETH)
    const crossChainTrade = await client.executeCrossChainTrade({
      fromToken: COMMON_TOKENS.SVM.USDC,
      toToken: COMMON_TOKENS.EVM.ETH,
      amount: '100',
      price: '3500.0',
      slippageTolerance: '0.5'
    });
    console.log('Cross-Chain Trade Result:', crossChainTrade);

    // Get trade history (filtered by chain)
    const solTrades = await client.getTrades({ chain: BlockchainType.SVM });
    console.log('Solana Trade History:', solTrades);

    // Get competition status
    const status = await client.getCompetitionStatus();
    console.log('Competition Status:', status);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run the example
// example(); 