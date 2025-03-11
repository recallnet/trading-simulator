import { PriceSource } from '../../types';

interface RaydiumPriceResponse {
  success: boolean;
  data: {
    [tokenAddress: string]: {
      price: number;
    }
  };
}

/**
 * Raydium price provider implementation
 * Uses Raydium's API to get token prices
 */
export class RaydiumProvider implements PriceSource {
  private readonly BASE_URL = 'https://api.raydium.io/v2';

  getName(): string {
    return 'Raydium';
  }

  async getPrice(tokenAddress: string): Promise<number | null> {
    try {
      console.log(`[RaydiumProvider] Getting price for ${tokenAddress}`);
      
      const response = await fetch(`${this.BASE_URL}/main/price?fsyms=${tokenAddress}`);
      
      if (!response.ok) {
        console.error(`[RaydiumProvider] Error fetching price: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json() as RaydiumPriceResponse;
      
      if (data.success && data.data && data.data[tokenAddress]) {
        const price = data.data[tokenAddress].price;
        console.log(`[RaydiumProvider] Got price for ${tokenAddress}: $${price}`);
        return price;
      }
      
      console.log(`[RaydiumProvider] No price available for ${tokenAddress}`);
      return null;
    } catch (error) {
      console.error(`[RaydiumProvider] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async supports(tokenAddress: string): Promise<boolean> {
    try {
      const price = await this.getPrice(tokenAddress);
      return price !== null;
    } catch (error) {
      return false;
    }
  }
} 