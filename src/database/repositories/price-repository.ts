import { BaseRepository } from '../base-repository';
import { PriceRecord, DatabaseRow } from '../types';

/**
 * Repository for price data storage and retrieval
 */
export class PriceRepository extends BaseRepository<PriceRecord> {
  constructor() {
    super('prices');
    console.log('[PriceRepository] Initialized');
  }

  /**
   * Create a new price record
   * @param priceData The price data to store
   * @returns The created price record
   */
  async create(priceData: PriceRecord): Promise<PriceRecord> {
    console.log(`[PriceRepository] Storing price for ${priceData.token}: $${priceData.price}`);
    
    try {
      const query = `
        INSERT INTO prices (token, price, timestamp)
        VALUES ($1, $2, $3)
        RETURNING id, token, price, timestamp
      `;
      
      const values = [
        priceData.token,
        priceData.price,
        priceData.timestamp
      ];
      
      const result = await this.db.query(query, values);
      return this.mapToEntity(this.toCamelCase(result.rows[0]));
    } catch (error) {
      console.error('[PriceRepository] Error creating price record:', error);
      throw error;
    }
  }

  /**
   * Get the latest price for a token
   * @param token The token address
   * @returns The latest price record or null if not found
   */
  async getLatestPrice(token: string): Promise<PriceRecord | null> {
    console.log(`[PriceRepository] Getting latest price for ${token}`);
    
    try {
      const query = `
        SELECT id, token, price, timestamp
        FROM prices
        WHERE token = $1
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [token]);
      if (result.rows.length === 0) return null;
      
      return this.mapToEntity(this.toCamelCase(result.rows[0]));
    } catch (error) {
      console.error('[PriceRepository] Error getting latest price:', error);
      throw error;
    }
  }

  /**
   * Get price history for a token
   * @param token The token address
   * @param hours The number of hours to look back
   * @returns Array of price records
   */
  async getPriceHistory(token: string, hours: number): Promise<PriceRecord[]> {
    console.log(`[PriceRepository] Getting price history for ${token} (last ${hours} hours)`);
    
    try {
      const query = `
        SELECT id, token, price, timestamp
        FROM prices
        WHERE token = $1
          AND timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp ASC
      `;
      
      const result = await this.db.query(query, [token]);
      return result.rows.map((row: DatabaseRow) => this.mapToEntity(this.toCamelCase(row)));
    } catch (error) {
      console.error('[PriceRepository] Error getting price history:', error);
      throw error;
    }
  }

  /**
   * Get average price for a token over a time period
   * @param token The token address
   * @param hours The number of hours to look back
   * @returns The average price or null if no data
   */
  async getAveragePrice(token: string, hours: number): Promise<number | null> {
    try {
      const query = `
        SELECT AVG(price) as avg_price
        FROM prices
        WHERE token = $1
          AND timestamp > NOW() - INTERVAL '${hours} hours'
      `;
      
      const result = await this.db.query(query, [token]);
      if (!result.rows[0].avg_price) return null;
      
      return parseFloat(result.rows[0].avg_price);
    } catch (error) {
      console.error(`[PriceRepository] Error getting average price for ${token}:`, error);
      return null;
    }
  }

  /**
   * Get price change percentage for a token
   * @param token The token address
   * @param hours The number of hours to compare
   * @returns The price change percentage or null if not enough data
   */
  async getPriceChangePercentage(token: string, hours: number): Promise<number | null> {
    try {
      // First, get the latest price
      const latestPriceRecord = await this.getLatestPrice(token);
      if (!latestPriceRecord) return null;
      
      // Then get the earliest price in the specified time period
      const query = `
        SELECT price
        FROM prices
        WHERE token = $1
          AND timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp ASC
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [token]);
      if (result.rows.length === 0) return null;
      
      const earliestPrice = parseFloat(result.rows[0].price);
      const latestPrice = latestPriceRecord.price;
      
      // Calculate percentage change
      return ((latestPrice - earliestPrice) / earliestPrice) * 100;
    } catch (error) {
      console.error(`[PriceRepository] Error calculating price change for ${token}:`, error);
      return null;
    }
  }

  /**
   * Count the number of price records
   * @returns The count of price records
   */
  async count(): Promise<number> {
    try {
      const query = `SELECT COUNT(*) FROM prices`;
      const result = await this.db.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('[PriceRepository] Error counting records:', error);
      throw error;
    }
  }
  
  /**
   * Map database row to PriceRecord entity
   * @param data Row data with camelCase keys
   */
  protected mapToEntity(data: DatabaseRow): PriceRecord {
    return {
      id: data.id,
      token: data.token,
      price: parseFloat(data.price),
      timestamp: new Date(data.timestamp)
    };
  }
} 