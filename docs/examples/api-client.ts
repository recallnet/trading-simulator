/**
 * Trading Simulator API Client
 *
 * This client handles authentication and provides methods for interacting
 * with the Trading Simulator API. It's designed primarily for teams participating in trading
 * competitions to execute trades, check balances, and view competition status.
 *
 * Required configuration:
 * - API key: Your team's unique API key provided during registration
 * - Base URL: The endpoint of the Trading Simulator server
 * - Debug Mode (optional): Enable detailed logging for API requests
 *
 * @example
 * // Basic setup
 * const client = new TradingSimulatorClient(
 *   "sk_7b550f528ba35cfb50b9de65b63e27e4",  // Your API key
 *   "https://trading-simulator.example.com",  // API base URL
 *   false  // Debug mode (optional, default: false)
 * );
 *
 * // Get team balances
 * const balances = await client.getBalance();
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

import { 
  ApiResponse, 
  BlockchainType, 
  SpecificChain, 
  BalancesResponse, 
  TradeHistoryResponse,
  PriceResponse,
  TokenInfoResponse,
  TradeResponse,
  QuoteResponse,
  CompetitionStatusResponse,
  LeaderboardResponse,
  TeamProfileResponse,
  PortfolioResponse,
  TradeExecutionParams
} from '../../e2e/utils/api-types';

// Common token addresses
export const COMMON_TOKENS = {
  // Solana tokens
  SVM: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    SOL: 'So11111111111111111111111111111111111111112',
  },
  // Ethereum tokens
  EVM: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    LINK: '0x514910771af9ca656af840dff83e8264ecf986ca', // Chainlink
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548', // Arbitrum
    TOSHI: '0x532f27101965dd16442E59d40670FaF5eBB142E4', // Toshi token on Base
  },
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
  [COMMON_TOKENS.SVM.USDC]: SpecificChain.SVM,
};

export class TradingSimulatorClient {
  private apiKey: string;
  private baseUrl: string;
  private debug: boolean;

  /**
   * Create a new instance of the Trading Simulator client
   *
   * @param apiKey The API key for your team
   * @param baseUrl The base URL of the Trading Simulator API (default: http://localhost:3000)
   * @param debug Whether to enable debug logging (default: false)
   */
  constructor(apiKey: string, baseUrl: string = 'http://localhost:3000', debug: boolean = false) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.debug = debug;
  }

  /**
   * Generate the required headers for API authentication
   *
   * @returns An object containing the required headers
   */
  private generateHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.debug) {
      console.log('[ApiClient] Request headers:');
      console.log('[ApiClient] Authorization: Bearer xxxxx... (masked)');
      console.log('[ApiClient] Content-Type:', headers['Content-Type']);
    }

    return headers;
  }

  /**
   * Make a request to the API
   *
   * @param method The HTTP method
   * @param path The API endpoint path
   * @param body The request body (if any)
   * @returns A promise that resolves to the API response
   */
  public async request<T>(method: string, path: string, body: any = null): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    // Convert body to JSON string if it exists
    const bodyString = body ? JSON.stringify(body) : undefined;

    // Generate headers with Bearer token authentication
    const headers = this.generateHeaders();

    const options: RequestInit = {
      method,
      headers,
      body: bodyString,
    };

    if (this.debug) {
      console.log('[ApiClient] Request details:');
      console.log('[ApiClient] Method:', method);
      console.log('[ApiClient] URL:', url);
      console.log('[ApiClient] Body:', body ? JSON.stringify(body, null, 2) : 'none');
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'API request failed');
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
   * Log in as an admin user
   *
   * @param apiKey The admin API key
   * @returns A promise that resolves to the login response
   */
  async loginAsAdmin(apiKey: string): Promise<ApiResponse> {
    // Store the admin API key for future requests
    this.apiKey = apiKey;
    return { success: true };
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
  async getBalances(): Promise<BalancesResponse> {
    return this.request<BalancesResponse>('GET', '/api/account/balances');
  }

  /**
   * Get the trade history for your team
   *
   * @param options Optional filtering parameters
   * @returns A promise that resolves to the trade history response
   */
  async getTradeHistory(options?: {
    limit?: number;
    offset?: number;
    token?: string;
    chain?: BlockchainType;
  }): Promise<TradeHistoryResponse> {
    let query = '';

    if (options) {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.token) params.append('token', options.token);
      if (options.chain) params.append('chain', options.chain);
      query = `?${params.toString()}`;
    }

    return this.request<TradeHistoryResponse>('GET', `/api/account/trades${query}`);
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
    specificChain?: SpecificChain,
  ): Promise<PriceResponse> {
    let query = `?token=${encodeURIComponent(token)}`;

    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }

    // Add specificChain parameter if provided (for EVM tokens)
    if (specificChain) {
      query += `&specificChain=${specificChain}`;
    }

    return this.request<PriceResponse>('GET', `/api/price${query}`);
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
    specificChain?: SpecificChain,
  ): Promise<TokenInfoResponse> {
    let query = `?token=${encodeURIComponent(token)}`;

    // Add chain parameter if explicitly provided
    if (chain) {
      query += `&chain=${chain}`;
    }

    // Add specificChain parameter if provided
    if (specificChain) {
      query += `&specificChain=${specificChain}`;
    }

    return this.request<TokenInfoResponse>('GET', `/api/price/token-info${query}`);
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
  async executeTrade(params: TradeExecutionParams): Promise<TradeResponse> {
    // Create the request payload
    const payload: any = {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
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
    return this.request<TradeResponse>('POST', '/api/trade/execute', payload);
  }

  /**
   * Get a quote for a potential trade between two tokens
   *
   * @param params Trade quote parameters
   * @returns A promise resolving to the quote response
   */
  async getQuote(params: TradeExecutionParams): Promise<QuoteResponse> {
    // Build the query string
    let query = `?fromToken=${encodeURIComponent(params.fromToken)}&toToken=${encodeURIComponent(params.toToken)}&amount=${encodeURIComponent(params.amount)}`;

    // Add optional parameters if they exist
    if (params.fromChain) query += `&fromChain=${params.fromChain}`;
    if (params.toChain) query += `&toChain=${params.toChain}`;
    if (params.fromSpecificChain) query += `&fromSpecificChain=${params.fromSpecificChain}`;
    if (params.toSpecificChain) query += `&toSpecificChain=${params.toSpecificChain}`;
    if (params.slippageTolerance) query += `&slippageTolerance=${params.slippageTolerance}`;

    return this.request<QuoteResponse>('GET', `/api/trade/quote${query}`);
  }

  /**
   * Get the status of the current competition
   *
   * @returns A promise that resolves to the competition status response
   */
  async getCompetitionStatus(): Promise<CompetitionStatusResponse> {
    return this.request<CompetitionStatusResponse>('GET', '/api/competition/status');
  }

  /**
   * Get the leaderboard for the current competition
   *
   * @param competitionId Optional ID of a specific competition (uses active competition by default)
   * @returns A promise that resolves to the leaderboard response
   */
  async getLeaderboard(competitionId?: string): Promise<LeaderboardResponse> {
    const path = competitionId
      ? `/api/competition/leaderboard?competitionId=${competitionId}`
      : '/api/competition/leaderboard';

    return this.request<LeaderboardResponse>('GET', path);
  }

  /**
   * Get your team's profile information
   *
   * @returns A promise that resolves to the team profile
   */
  async getProfile(): Promise<TeamProfileResponse> {
    return this.request<TeamProfileResponse>('GET', '/api/account/profile');
  }

  /**
   * Update your team's profile information
   *
   * @param profileData Profile data to update
   * @returns A promise that resolves to the updated profile
   */
  async updateProfile(profileData: { 
    contactPerson?: string;
    metadata?: {
      ref?: {
        name?: string;
        version?: string;
        url?: string;
      };
      description?: string;
      social?: {
        name?: string;
        email?: string;
        twitter?: string;
      };
    };
  }): Promise<TeamProfileResponse> {
    return this.request<TeamProfileResponse>('PUT', '/api/account/profile', profileData);
  }

  /**
   * Get portfolio information for your team
   *
   * @returns A promise that resolves to the portfolio information
   */
  async getPortfolio(): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>('GET', '/api/account/portfolio');
  }
}

// Example usage
async function example() {
  const client = new TradingSimulatorClient(
    'your-api-key',
    'http://localhost:3000',
    false, // Set to true to enable debug logging for API requests
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
      toChain: BlockchainType.SVM,
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
      toSpecificChain: SpecificChain.ETH,
    });
    console.log('ETH Trade Result:', ethTrade);

    // Get a quote for a potential trade
    const quote = await client.getQuote({
      fromToken: COMMON_TOKENS.SVM.USDC,
      toToken: COMMON_TOKENS.SVM.SOL,
      amount: '100',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM,
    });
    console.log('Trade Quote:', quote);

    // Get trade history (filtered by chain)
    const solTrades = await client.getTradeHistory({ chain: BlockchainType.SVM });
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
 * Authentication Information
 *
 * This client uses Bearer token authentication. The token is passed in the Authorization header:
 *
 * Authorization: Bearer your-api-key
 *
 * Troubleshooting Authentication:
 *
 * If you're experiencing authentication issues, you can enable debug mode by passing
 * true as the third parameter to the TradingSimulatorClient constructor:
 *
 * const client = new TradingSimulatorClient(
 *   "your-api-key",
 *   "https://trading-simulator.example.com",
 *   true  // Enable debug logging
 * );
 *
 * This will log detailed information about each request, including:
 * - The request method, URL, and body
 * - The authorization header being used (partially masked for security)
 *
 * Common Authentication Issues:
 *
 * - Invalid API key: Make sure you're using the exact API key provided during team registration
 * - API key format: The key should be provided exactly as is without any modifications
 * - Expired API key: Contact the competition organizers if you believe your key has expired
 */

// Uncomment to run the example
// example();
