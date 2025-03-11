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
   * @param method The HTTP method (GET, POST, etc.)
   * @param path The API endpoint path (e.g., /api/account/balances)
   * @param body The request body (if any)
   * @returns A promise that resolves to the response data
   */
  private async request<T>(method: string, path: string, body: any = null): Promise<T> {
    const url = this.baseUrl + path;
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers = this.generateHeaders(method, path, bodyStr);
    
    const options: RequestInit = {
      method,
      headers,
      body: bodyStr || undefined,
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorBody}`);
    }
    
    return response.json() as Promise<T>;
  }

  /**
   * Get account balances for your team
   * 
   * @returns A promise that resolves to the account balances
   */
  async getBalances(): Promise<any> {
    return this.request<any>('GET', '/api/account/balances');
  }

  /**
   * Get the current price of a token
   * 
   * @param tokenAddress The Solana token address (e.g., '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' for SOL)
   * @returns A promise that resolves to the current price data
   */
  async getPrice(tokenAddress: string): Promise<any> {
    return this.request<any>('GET', `/api/market/prices/${tokenAddress}`);
  }

  /**
   * Execute a trade
   * 
   * @param tokenAddress The Solana token address (e.g., '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R')
   * @param side The trade side ('buy' or 'sell')
   * @param amount The amount to trade
   * @returns A promise that resolves to the trade result
   */
  async executeTrade(tokenAddress: string, side: 'buy' | 'sell', amount: number): Promise<any> {
    const body = {
      tokenAddress,
      side,
      amount
    };
    
    return this.request<any>('POST', '/api/trading/execute', body);
  }

  /**
   * Get trade history
   * 
   * @returns A promise that resolves to the trade history
   */
  async getTradeHistory(): Promise<any> {
    return this.request<any>('GET', '/api/trading/history');
  }

  /**
   * Get competition status
   * 
   * @returns A promise that resolves to the competition status
   */
  async getCompetitionStatus(): Promise<any> {
    return this.request<any>('GET', '/api/competition/status');
  }

  /**
   * Get competition leaderboard
   * 
   * @returns A promise that resolves to the competition leaderboard
   */
  async getLeaderboard(): Promise<any> {
    return this.request<any>('GET', '/api/competition/leaderboard');
  }

  /**
   * Get competition rules
   * 
   * @returns A promise that resolves to the competition rules
   */
  async getCompetitionRules(): Promise<any> {
    return this.request<any>('GET', '/api/competition/rules');
  }
}

// Example usage
async function example() {
  // Replace with actual team credentials
  const apiKey = 'sk_ee08b6e5d6571bd78c3efcc64ae1da0e';
  const apiSecret = 'f097f3c2a7ee7e043c1152c7943ea95906b7bcd54276b506aa19931efd45239c';
  
  const client = new TradingSimulatorClient(apiKey, apiSecret);
  
  try {
    // Get account balances
    const balances = await client.getBalances();
    console.log('Balances:', balances);
    
    // Get current price of a Solana token
    const solToken = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';
    const tokenPrice = await client.getPrice(solToken);
    console.log('Token Price:', tokenPrice);
    
    // Execute a trade for a Solana token
    const tradeResult = await client.executeTrade(solToken, 'buy', 0.1);
    console.log('Trade Result:', tradeResult);
    
    // Get trade history
    const tradeHistory = await client.getTradeHistory();
    console.log('Trade History:', tradeHistory);
    
    // Get competition status
    const competitionStatus = await client.getCompetitionStatus();
    console.log('Competition Status:', competitionStatus);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run the example
// example().catch(console.error); 