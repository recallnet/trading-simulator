import { PriceSource } from '../../types';

interface JupiterPriceResponse {
  data: {
    [tokenAddress: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: string;
    }
  };
}

/**
 * Jupiter price provider implementation
 * Uses Jupiter's API to get token prices
 */
export class JupiterProvider implements PriceSource {
  private readonly BASE_URL = 'https://price.jup.ag/v4';

  getName(): string {
    return 'Jupiter';
  }

  async getPrice(tokenAddress: string): Promise<number | null> {
    try {
      console.log(`[JupiterProvider] Getting price for ${tokenAddress}`);
      
      const response = await fetch(`${this.BASE_URL}/price?ids=${tokenAddress}`);
      
      if (!response.ok) {
        console.error(`[JupiterProvider] Error fetching price: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json() as JupiterPriceResponse;
      
      if (data.data && data.data[tokenAddress]) {
        const price = parseFloat(data.data[tokenAddress].price);
        console.log(`[JupiterProvider] Got price for ${tokenAddress}: $${price}`);
        return price;
      }
      
      console.log(`[JupiterProvider] No price available for ${tokenAddress}`);
      return null;
    } catch (error) {
      console.error(`[JupiterProvider] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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