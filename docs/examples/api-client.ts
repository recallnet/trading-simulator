import * as crypto from 'crypto';

/**
 * Trading Simulator API Client
 * 
 * This client handles authentication, request signing, and provides methods for interacting
 * with the Trading Simulator API. It's designed primarily for teams participating in trading
 * competitions to execute trades, check balances, and view competition status.
 * 
 * Required configuration:
 * - API key: Your team's unique API key provided during registration
 * - API secret: Your team's secret key for request signing (keep this secure!)
 * - Base URL: The endpoint of the Trading Simulator server
 * - Debug Mode (optional): Enable detailed logging for API requests
 * 
 * @example
 * // Basic setup
 * const client = new TradingSimulatorClient(
 *   "sk_7b550f528ba35cfb50b9de65b63e27e4",  // Your API key
 *   "a56229f71f5a2a42f93197fb32159916d1ff7796433c133d00b90097a0bbf12f",  // Your API secret 
 *   "https://trading-simulator.example.com",  // API base URL
 *   false  // Debug mode (optional, default: false)
 * );
 * 
 * // Get team balances
 * const balances = await client.getBalances();
 * 
 * // Execute a trade on Base chain (within-chain trade)
 * const tradeResult = await client.executeTrade({
 *   fromToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
 *   toToken: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", // TOSHI on Base
 *   amount: "50",
 *   fromChain: BlockchainType.EVM,
 *   toChain: BlockchainType.EVM,
 *   fromSpecificChain: SpecificChain.BASE,
 *   toSpecificChain: SpecificChain.BASE
 * });
 */

// Define blockchain types
export enum BlockchainType {
  SVM = 'svm', // Solana Virtual Machine
  EVM = 'evm'  // Ethereum Virtual Machine
}

// Define specific EVM chains
export enum SpecificChain {
  ETH = 'eth',
  POLYGON = 'polygon',
  BSC = 'bsc',
  ARBITRUM = 'arbitrum',
  BASE = 'base',
  OPTIMISM = 'optimism', 
  AVALANCHE = 'avalanche',
  LINEA = 'linea',
  SVM = 'svm'
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
    ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    LINK: '0x514910771af9ca656af840dff83e8264ecf986ca', // Chainlink
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548', // Arbitrum
    TOSHI: '0x532f27101965dd16442E59d40670FaF5eBB142E4' // Toshi token on Base
  }
};

// Map tokens to their known chains for quick lookups
export const TOKEN_CHAINS: Record<string, SpecificChain> = {
  // EVM tokens with their specific chains
  [COMMON_TOKENS.EVM.ETH]: SpecificChain.ETH,
  [COMMON_TOKENS.EVM.USDC]: SpecificChain.ETH,
  [COMMON_TOKENS.EVM.LINK]: SpecificChain.ETH,
  [COMMON_TOKENS.EVM.ARB]: SpecificChain.ARBITRUM,
  [COMMON_TOKENS.EVM.TOSHI]: SpecificChain.BASE,
  
  // SVM tokens
  [COMMON_TOKENS.SVM.SOL]: SpecificChain.SVM,
  [COMMON_TOKENS.SVM.USDC]: SpecificChain.SVM
};

export class TradingSimulatorClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private debug: boolean;

  /**
   * Create a new instance of the Trading Simulator client
   * 
   * @param apiKey The API key for your team
   * @param apiSecret The API secret for your team
   * @param baseUrl The base URL of the Trading Simulator API (default: http://localhost:3000)
   * @param debug Whether to enable debug logging (default: false)
   */
  constructor(
    apiKey: string,
    apiSecret: string,
    baseUrl: string = 'http://localhost:3000',
    debug: boolean = false
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
    this.debug = debug;
  }

  /**
   * Generate the required headers for API authentication
   * 
   * @param method The HTTP method (GET, POST, etc.)
   * @param path The API endpoint path (e.g., /api/account/balances)
   * @param body The request body (if any)
   * @returns An object containing the required headers
   */
  private generateHeaders(method: string, path: string, body: any = null): Record<string, string> {
    // Use current timestamp for production use
    const timestamp = new Date().toISOString();
    
    // IMPORTANT: Always use '{}' for empty bodies to match server-side signature validation
    // The server expects empty requests to have an empty JSON object in signature calculation
    const bodyString = body ? JSON.stringify(body) : '{}';
    
    // CRITICAL: Ensure path format matches server-side validation
    // Server expects: method + path + timestamp + bodyString
    // Path should include the leading slash
    const data = method + path + timestamp + bodyString;
    
    if (this.debug) {
      console.log('[ApiClient] Request details:');
      console.log('[ApiClient] Method:', method);
      console.log('[ApiClient] Path:', path);
      console.log('[ApiClient] Path for signature:', path);
      console.log('[ApiClient] Timestamp:', timestamp);
      console.log('[ApiClient] Body:', bodyString);
      console.log('[ApiClient] Payload:', data);
      console.log('[ApiClient] API Key:', this.apiKey);
      console.log('[ApiClient] Secret Length:', this.apiSecret.length);
    }
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(data)
      .digest('hex');

    if (this.debug) {
      console.log('[ApiClient] Signature:', signature);
    }

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
    
    // Convert body to JSON string if it exists, otherwise use '{}'
    // This is critical for signature validation to match server-side expectation
    const bodyString = body ? JSON.stringify(body) : '{}';
    
    // Generate headers using the standardized format
    const headers = this.generateHeaders(method, path, body);
    
    const options: RequestInit = {
      method,
      headers,
      body: body ? bodyString : undefined  // Only include body in the actual request if it exists
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
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
   * Get your team's token balances across all supported chains
   * 
   * @returns Balance information including tokens on all chains (EVM and SVM)
   * 
   * @example
   * const balances = await client.getBalances();
   * console.log('My ETH balance on Base:', balances.balances.find(b => b.token === '0x4200000000000000000000000000000000000006')?.amount);
   * console.log('My USDC balance on Base:', balances.balances.find(b => b.token === '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')?.amount);
   */
  async getBalances(): Promise<{
    success: boolean;
    teamId: string;
    balances: Array<{
      token: string;
      amount: number;
      chain: string;
      specificChain: string | null;
    }>;
  }> {
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
  }): Promise<{
    success: boolean;
    teamId: string;
    trades: Array<{
      id: string;
      teamId: string;
      fromToken: string;
      toToken: string;
      fromAmount: string;
      toAmount: string;
      executionPrice: string;
      timestamp: string;
    }>;
  }> {
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
   * @param specificChain Optional specific chain for EVM tokens (like eth, polygon, base, etc.)
   * @returns A promise that resolves to the price response
   */
  async getPrice(
    token: string, 
    chain?: BlockchainType,
    specificChain?: SpecificChain
  ): Promise<{
    success: boolean;
    price: number;
    token: string;
    chain: string;
    specificChain?: string;
  }> {
    let query = `?token=${encodeURIComponent(token)}`;
    
    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }
    
    // Add specificChain parameter if provided (for EVM tokens)
    if (specificChain) {
      query += `&specificChain=${specificChain}`;
    }
    
    return this.request<any>('GET', `/api/price${query}`);
  }

  /**
   * Get detailed token information including specific chain
   * 
   * @param token The token address
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens
   * @returns A promise that resolves to the token info response
   */
  async getTokenInfo(
    token: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain
  ): Promise<{
    success: boolean;
    price: number;
    token: string;
    chain: string;
    specificChain?: string;
  }> {
    let query = `?token=${encodeURIComponent(token)}`;
    
    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }
    
    // Add specificChain parameter if provided
    if (specificChain) {
      query += `&specificChain=${specificChain}`;
    }
    
    return this.request<any>('GET', `/api/price/token-info${query}`);
  }

  /**
   * Execute a token trade on the trading simulator
   * 
   * This method allows you to trade between tokens on the same chain,
   * which is the default supported behavior.
   * 
   * @param params - Trade parameters
   * @param params.fromToken - Source token address to sell
   * @param params.toToken - Destination token address to buy
   * @param params.amount - Amount of fromToken to sell (as string)
   * @param params.slippageTolerance - Optional slippage tolerance percentage (e.g., "0.5" for 0.5%)
   * @param params.fromChain - Blockchain type of source token (BlockchainType.EVM or BlockchainType.SVM)
   * @param params.fromSpecificChain - Specific chain for source token (e.g., SpecificChain.ETH, SpecificChain.BASE)
   *                                   Providing this greatly improves performance for EVM tokens
   * @param params.toChain - Blockchain type of destination token (should match fromChain for within-chain trades)
   * @param params.toSpecificChain - Specific chain for destination token (should match fromSpecificChain)
   * 
   * @returns Trade result with transaction ID, amounts, and updated balances
   * 
   * @example
   * // Trade USDC for TOSHI on Base chain (within-chain trade)
   * const tradeResult = await client.executeTrade({
   *   fromToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
   *   toToken: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",   // TOSHI on Base
   *   amount: "50",
   *   fromChain: BlockchainType.EVM,
   *   toChain: BlockchainType.EVM,
   *   fromSpecificChain: SpecificChain.BASE,
   *   toSpecificChain: SpecificChain.BASE
   * });
   */
  async executeTrade(params: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippageTolerance?: string;
    fromChain?: BlockchainType;
    toChain?: BlockchainType;
    fromSpecificChain?: SpecificChain;
    toSpecificChain?: SpecificChain;
  }): Promise<{
    id: string;
    teamId: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    executionPrice: string;
    timestamp: string;
  }> {
    // Create the request payload
    const payload: any = {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount
    };
    
    // Add optional parameters if they exist
    if (params.slippageTolerance) payload.slippageTolerance = params.slippageTolerance;
    if (params.fromChain) payload.fromChain = params.fromChain;
    if (params.toChain) payload.toChain = params.toChain;
    if (params.fromSpecificChain) payload.fromSpecificChain = params.fromSpecificChain;
    if (params.toSpecificChain) payload.toSpecificChain = params.toSpecificChain;
    
    // If chain parameters are not provided, try to detect them
    if (!params.fromChain) {
      payload.fromChain = this.detectChain(params.fromToken);
    }
    
    if (!params.toChain) {
      payload.toChain = this.detectChain(params.toToken);
    }
    
    // Make the API request
    return this.request<any>('POST', '/api/trade/execute', payload);
  }

  /**
   * Get a quote for a potential trade between two tokens
   * 
   * @param params Trade quote parameters
   * @returns A promise resolving to the quote response
   */
  async getQuote(params: {
    fromToken: string;
    toToken: string;
    amount: string;
    fromChain?: BlockchainType;
    toChain?: BlockchainType;
    fromSpecificChain?: SpecificChain;
    toSpecificChain?: SpecificChain;
  }): Promise<{
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    price: string;
    timestamp: string;
  }> {
    // Build the query string
    let query = `?fromToken=${encodeURIComponent(params.fromToken)}&toToken=${encodeURIComponent(params.toToken)}&amount=${encodeURIComponent(params.amount)}`;
    
    // Add optional parameters if they exist
    if (params.fromChain) query += `&fromChain=${params.fromChain}`;
    if (params.toChain) query += `&toChain=${params.toChain}`;
    if (params.fromSpecificChain) query += `&fromSpecificChain=${params.fromSpecificChain}`;
    if (params.toSpecificChain) query += `&toSpecificChain=${params.toSpecificChain}`;
    
    return this.request<any>('GET', `/api/trade/quote${query}`);
  }

  /**
   * Get the status of the current competition
   * 
   * @returns A promise that resolves to the competition status response
   */
  async getCompetitionStatus(): Promise<{
    success: boolean;
    active: boolean;
    competition?: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
    };
    message?: string;
  }> {
    return this.request<any>('GET', '/api/competition/status');
  }

  /**
   * Get the leaderboard for the current competition
   * 
   * @param competitionId Optional ID of a specific competition (uses active competition by default)
   * @returns A promise that resolves to the leaderboard response
   */
  async getLeaderboard(competitionId?: string): Promise<{
    success: boolean;
    competition: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
    };
    leaderboard: Array<{
      rank: number;
      teamId: string;
      teamName: string;
      portfolioValue: number;
    }>;
  }> {
    const query = competitionId ? `?competitionId=${competitionId}` : '';
    return this.request<any>('GET', `/api/competition/leaderboard${query}`);
  }

  /**
   * Get your team's profile information
   * 
   * @returns A promise that resolves to the team profile
   */
  async getProfile(): Promise<{
    success: boolean;
    team: {
      id: string;
      name: string;
      email: string;
      contact_person: string;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.request<any>('GET', '/api/account/profile');
  }

  /**
   * Update your team's profile information
   * 
   * @param profileData Profile data to update
   * @returns A promise that resolves to the updated profile
   */
  async updateProfile(profileData: {
    contactPerson?: string;
  }): Promise<{
    success: boolean;
    team: {
      id: string;
      name: string;
      email: string;
      contact_person: string;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return this.request<any>('PUT', '/api/account/profile', profileData);
  }

  /**
   * Get portfolio information for your team
   * 
   * @returns A promise that resolves to the portfolio information
   */
  async getPortfolio(): Promise<{
    success: boolean;
    teamId: string;
    totalValue: number;
    tokens: Array<{
      token: string;
      amount: number;
      price: number;
      value: number;
      chain: string;
      specificChain: string | null;
    }>;
    snapshotTime: string;
    source: string;
  }> {
    return this.request<any>('GET', '/api/account/portfolio');
  }
}

// Example usage
async function example() {
  const client = new TradingSimulatorClient(
    'your-api-key',
    'your-api-secret',
    'http://localhost:3000',
    false // Set to true to enable debug logging for API requests
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
      fromToken: COMMON_TOKENS.SVM.USDC,
      toToken: COMMON_TOKENS.SVM.SOL,
      amount: '10',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    console.log('SOL Trade Result:', solTrade);

    // Execute a trade to buy ETH on Ethereum
    const ethTrade = await client.executeTrade({
      fromToken: COMMON_TOKENS.EVM.USDC,
      toToken: COMMON_TOKENS.EVM.ETH,
      amount: '10',
      fromChain: BlockchainType.EVM,
      toChain: BlockchainType.EVM,
      fromSpecificChain: SpecificChain.ETH,
      toSpecificChain: SpecificChain.ETH
    });
    console.log('ETH Trade Result:', ethTrade);

    // Get a quote for a potential trade
    const quote = await client.getQuote({
      fromToken: COMMON_TOKENS.SVM.USDC,
      toToken: COMMON_TOKENS.SVM.SOL,
      amount: '100',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    console.log('Trade Quote:', quote);

    // Get trade history (filtered by chain)
    const solTrades = await client.getTrades({ chain: BlockchainType.SVM });
    console.log('Solana Trade History:', solTrades);

    // Get competition status
    const status = await client.getCompetitionStatus();
    console.log('Competition Status:', status);
    
    // Get portfolio information
    const portfolio = await client.getPortfolio();
    console.log('Portfolio Information:', portfolio);
    console.log('Total Portfolio Value:', portfolio.totalValue);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Troubleshooting Authentication
 * 
 * If you're experiencing authentication issues, you can enable debug mode by passing
 * true as the fourth parameter to the TradingSimulatorClient constructor:
 * 
 * const client = new TradingSimulatorClient(
 *   "your-api-key",
 *   "your-api-secret",
 *   "https://trading-simulator.example.com",
 *   true  // Enable debug logging
 * );
 * 
 * This will log detailed information about each request:
 * - The request method, path, and body
 * - The exact payload used for signature generation
 * - The generated signature
 * 
 * Authentication Details:
 * 
 * The client uses HMAC-SHA256 signatures for authentication with these steps:
 * 1. Concatenate: method + path + timestamp + bodyString
 *    (e.g., "GET/api/account/balances2023-10-15T14:30:00.000Z{}")
 * 2. Sign this data using your API secret
 * 3. Send the signature in the X-Signature header
 * 
 * Common Authentication Issues:
 * 
 * - Path format: Ensure the path includes the leading slash
 * - Empty bodies: For GET requests with no body, "{}" is used in signature calculation
 * - Timestamp format: Must be a valid ISO string (new Date().toISOString())
 * - API secret format: Must be the exact secret provided during team registration
 */

// Uncomment to run the example
// example(); 