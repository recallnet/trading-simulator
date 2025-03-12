import * as crypto from 'crypto';

/**
 * Trading Simulator API Client
 * 
 * This example client demonstrates how to authenticate and make requests
 * to the Trading Simulator API using TypeScript.
 */
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
   * @returns A promise that resolves to the trade history response
   */
  async getTrades(): Promise<any> {
    return this.request<any>('GET', '/api/account/trades');
  }

  /**
   * Get the current price for a token
   * 
   * @param token The token address to get the price for (e.g., the SOL token address)
   * @returns A promise that resolves to the price response
   */
  async getPrice(token: string): Promise<any> {
    // Use query parameters for token
    return this.request<any>('GET', `/api/price?token=${encodeURIComponent(token)}`);
  }

  /**
   * Get a price from a specific provider
   * 
   * @param token The token address to get the price for
   * @param provider The provider name (e.g., "jupiter", "raydium", "serum")
   * @returns A promise that resolves to the price response
   */
  async getPriceFromProvider(token: string, provider: string): Promise<any> {
    return this.request<any>(
      'GET',
      `/api/price/provider?token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`
    );
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
  }): Promise<any> {
    // Format parameters for API call
    // For buy orders, we're buying tokenAddress using USDC
    // For sell orders, we're selling tokenAddress to get USDC
    const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
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
    // Get balances
    const balances = await client.getBalances();
    console.log('Balances:', balances);

    // Get team profile
    const profile = await client.getProfile();
    console.log('Team Profile:', profile);

    // Get price for SOL
    const solTokenAddress = 'So11111111111111111111111111111111111111112';
    const price = await client.getPrice(solTokenAddress);
    console.log('SOL Price:', price);

    // Execute a trade to buy SOL
    const trade = await client.executeTrade({
      tokenAddress: solTokenAddress,
      side: 'buy',
      amount: '10', // 10 USDC
      price: '1.0' // Optional
    });
    console.log('Trade Result:', trade);

    // Get trade history
    const trades = await client.getTrades();
    console.log('Trade History:', trades);

    // Get competition status
    const status = await client.getCompetitionStatus();
    console.log('Competition Status:', status);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run the example
// example(); 