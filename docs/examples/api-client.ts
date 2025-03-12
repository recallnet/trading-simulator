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
   * @param baseUrl The base URL of the Trading Simulator API (default: http://localhost:3000)
   */
  constructor(
    apiKey: string,
    apiSecret: string,
    baseUrl: string = 'http://localhost:3000'
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
    const timestamp = new Date().toISOString();
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
   * Get the current portfolio for your team
   * 
   * @returns A promise that resolves to the portfolio response
   */
  async getPortfolio(): Promise<any> {
    return this.request<any>('GET', '/api/account/portfolio');
  }

  /**
   * Get the current price for a token
   * 
   * @param token The token to get the price for (e.g., "SOL")
   * @returns A promise that resolves to the price response
   */
  async getPrice(token: string): Promise<any> {
    // Use query parameters for token
    return this.request<any>('GET', `/api/price/current?token=${encodeURIComponent(token)}`);
  }

  /**
   * Get a quote for a trade
   * 
   * @param fromToken The token to sell
   * @param toToken The token to buy
   * @param amount The amount to sell
   * @returns A promise that resolves to the quote response
   */
  async getTradeQuote(fromToken: string, toToken: string, amount: number): Promise<any> {
    return this.request<any>(
      'GET', 
      `/api/trade/quote?fromToken=${encodeURIComponent(fromToken)}&toToken=${encodeURIComponent(toToken)}&amount=${amount}`
    );
  }

  /**
   * Execute a trade
   * 
   * @param fromToken The token to sell
   * @param toToken The token to buy
   * @param amount The amount to sell
   * @param slippageTolerance Optional slippage tolerance percentage
   * @returns A promise that resolves to the trade response
   */
  async executeTrade(
    fromToken: string,
    toToken: string,
    amount: number,
    slippageTolerance?: number
  ): Promise<any> {
    return this.request<any>('POST', '/api/trade/execute', {
      fromToken,
      toToken,
      amount,
      slippageTolerance
    });
  }

  /**
   * Get trade history for your team
   * 
   * @returns A promise that resolves to the trade history response
   */
  async getTrades(): Promise<any> {
    return this.request<any>('GET', '/api/account/trades');
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
   * Get the rules for the current competition
   * 
   * @returns A promise that resolves to the competition rules response
   */
  async getCompetitionRules(): Promise<any> {
    return this.request<any>('GET', '/api/competition/rules');
  }
}

// Example usage
async function example() {
  const client = new TradingSimulatorClient(
    'your-api-key',
    'your-api-secret',
    'http://localhost:3000'
  );

  try {
    // Get balances
    const balances = await client.getBalances();
    console.log('Balances:', balances);

    // Get portfolio
    const portfolio = await client.getPortfolio();
    console.log('Portfolio:', portfolio);

    // Get price
    const price = await client.getPrice('SOL');
    console.log('SOL Price:', price);

    // Execute a trade
    const trade = await client.executeTrade('USDC', 'SOL', 100);
    console.log('Trade Result:', trade);

    // Get competition status
    const status = await client.getCompetitionStatus();
    console.log('Competition Status:', status);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run the example
// example(); 