import axios, { AxiosInstance } from 'axios';

/**
 * API client for testing the Solana Trading Simulator
 * 
 * This client handles authentication and convenience methods
 * for interacting with the API endpoints.
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private apiKey: string | undefined;
  private baseUrl: string;
  private adminApiKey: string | undefined;

  /**
   * Create a new API client
   * 
   * @param apiKey API key for authentication
   * @param baseUrl Optional custom base URL
   */
  constructor(
    apiKey?: string,
    baseUrl: string = 'http://localhost:3001'
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add interceptor to add authentication header
    this.axiosInstance.interceptors.request.use((config) => {
      // Add common headers
      config.headers = config.headers || {};
      
      // Set authentication header if API key is available
      if (this.apiKey) {
        config.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      // For admin routes, use admin API key if available and different from regular API key
      if (this.adminApiKey && 
          (config.url?.startsWith('/api/admin') || config.url?.includes('admin')) && 
          this.adminApiKey !== this.apiKey) {
        config.headers['Authorization'] = `Bearer ${this.adminApiKey}`;
      }
      
      // Log request (simplified)
      console.log(`[ApiClient] Request to ${config.method?.toUpperCase()} ${config.url}`);
      
      return config;
    });
    
    // Add interceptor to handle response
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Let the error propagate for specific handling
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Helper method to handle API errors consistently
   */
  private handleApiError(error: any, operation: string): any {
    console.error(`Failed to ${operation}:`, error);
    
    // Extract the detailed error message from the axios error response
    if (axios.isAxiosError(error) && error.response?.data) {
      // Return the actual error message from the server with correct status
      return { 
        success: false, 
        error: error.response.data.error || error.response.data.message || error.message,
        status: error.response.status
      };
    }
    
    // Fallback to the generic error message
    return { success: false, error: (error as any).message, status: 500 };
  }
  
  /**
   * Create an admin account
   */
  async createAdminAccount(username: string, password: string, email: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post('/api/admin/setup', {
        username,
        password,
        email
      });
      
      // If admin creation is successful, store the returned API key
      if (response.data.success && response.data.admin?.apiKey) {
        this.adminApiKey = response.data.admin.apiKey;
      }
      
      return response.data.success;
    } catch (error) {
      return this.handleApiError(error, 'create admin account').success;
    }
  }
  
  /**
   * Login as admin (this method now expects the admin API key directly)
   */
  async loginAsAdmin(apiKey: string): Promise<boolean> {
    try {
      // Store the admin API key
      this.adminApiKey = apiKey;
      
      // Verify the API key by making a simple admin request
      const response = await this.axiosInstance.get('/api/admin/teams');
      return response.data.success;
    } catch (error) {
      // Clear the admin API key if login fails
      this.adminApiKey = undefined;
      return this.handleApiError(error, 'login as admin').success;
    }
  }
  
  /**
   * Register a new team
   */
  async registerTeam(name: string, email: string, contactPerson: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/api/admin/teams/register', {
        teamName: name,
        email,
        contactPerson
      });
      
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'register team');
    }
  }
  
  /**
   * Start a competition
   */
  async startCompetition(name: string, description: string, teamIds: string[]): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/api/admin/competition/start', {
        name,
        description,
        teamIds
      });
      
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'start competition');
    }
  }
  
  /**
   * Create a team client with a provided API key
   */
  createTeamClient(apiKey: string): ApiClient {
    return new ApiClient(apiKey, this.baseUrl);
  }
  
  /**
   * Get team profile
   */
  async getProfile(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/account/profile');
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'get profile');
    }
  }
  
  /**
   * Update team profile
   */
  async updateProfile(profileData: any): Promise<any> {
    try {
      const response = await this.axiosInstance.put('/api/account/profile', profileData);
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'update profile');
    }
  }
  
  /**
   * List all teams (admin only)
   */
  async listAllTeams(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/admin/teams');
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'list teams');
    }
  }
  
  /**
   * Alias for listAllTeams for better readability in tests
   */
  async listTeams(): Promise<any> {
    return this.listAllTeams();
  }
  
  /**
   * Delete a team (admin only)
   * @param teamId ID of the team to delete
   */
  async deleteTeam(teamId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.delete(`/api/admin/teams/${teamId}`);
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'delete team');
    }
  }
  
  /**
   * Get account balances
   */
  async getBalance(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/account/balances');
      
      // Transform the balances array into an object with token addresses as keys
      if (response.data.success && Array.isArray(response.data.balances)) {
        const balanceObject: Record<string, number> = {};
        response.data.balances.forEach((balance: { token: string; amount: number }) => {
          // Store as numbers, not strings
          balanceObject[balance.token] = parseFloat(balance.amount.toString());
        });
        
        return {
          success: response.data.success,
          teamId: response.data.teamId,
          balance: balanceObject  // Use 'balance' (singular) to match what the tests expect
        };
      }
      
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'get balances');
    }
  }
  
  /**
   * Get trade history
   */
  async getTradeHistory(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/account/trades');
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'get trade history');
    }
  }
  
  /**
   * Execute a trade
   */
  async executeTrade(params: {
    fromToken: string;
    toToken: string;
    amount: string;
    slippageTolerance?: string;
    fromChain?: string;
    fromSpecificChain?: string;
    toChain?: string;
    toSpecificChain?: string;
  }): Promise<any> {
    console.log(`[ApiClient] executeTrade called with params: ${JSON.stringify(params, null, 2)}`);

    try {
      // Debug log
      console.log(`[ApiClient] About to execute trade with: ${JSON.stringify(params, null, 2)}`);
      
      // Make the API call with the exact parameters
      const response = await this.axiosInstance.post('/api/trade/execute', params);
      
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'execute trade');
    }
  }
  
  /**
   * Get competition status
   */
  async getCompetitionStatus(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/competition/status');
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'get competition status');
    }
  }
  
  /**
   * Get competition leaderboard
   */
  async getLeaderboard(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/competition/leaderboard');
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'get leaderboard');
    }
  }
  
  /**
   * Get token price
   * 
   * @param token The token address
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens
   * @returns A promise that resolves to the price response
   */
  async getPrice(token: string, chain?: string, specificChain?: string): Promise<any> {
    try {
      let path = `/api/price?token=${encodeURIComponent(token)}`;
      if (chain) {
        path += `&chain=${encodeURIComponent(chain)}`;
      }
      if (specificChain) {
        path += `&specificChain=${encodeURIComponent(specificChain)}`;
      }
      const response = await this.axiosInstance.get(path);
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'get price');
    }
  }

  /**
   * Get detailed token information
   * 
   * @param token The token address
   * @param chain Optional blockchain type (auto-detected if not provided)
   * @param specificChain Optional specific chain for EVM tokens
   * @returns A promise that resolves to the token info response
   */
  async getTokenInfo(token: string, chain?: string, specificChain?: string): Promise<any> {
    try {
      let path = `/api/price/token-info?token=${encodeURIComponent(token)}`;
      if (chain) {
        path += `&chain=${encodeURIComponent(chain)}`;
      }
      if (specificChain) {
        path += `&specificChain=${encodeURIComponent(specificChain)}`;
      }
      const response = await this.axiosInstance.get(path);
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'get token info');
    }
  }
  
  /**
   * End a competition (admin only)
   * @param competitionId ID of the competition to end
   */
  async endCompetition(competitionId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/api/admin/competition/end', {
        competitionId
      });
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'end competition');
    }
  }
  
  /**
   * Generic API request method for custom endpoints
   * @param method HTTP method (get, post, put, delete)
   * @param path API path
   * @param data Optional request data
   */
  async request(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any): Promise<any> {
    try {
      let response;
      if (method === 'get') {
        response = await this.axiosInstance.get(path);
      } else if (method === 'post') {
        response = await this.axiosInstance.post(path, data);
      } else if (method === 'put') {
        response = await this.axiosInstance.put(path, data);
      } else if (method === 'delete') {
        response = await this.axiosInstance.delete(path);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }
      return response.data;
    } catch (error) {
      return this.handleApiError(error, `${method} ${path}`);
    }
  }
} 