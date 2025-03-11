import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';

/**
 * Price Controller
 * Handles price-related operations
 */
export class PriceController {
  /**
   * Get current price for a token
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getCurrentPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      
      // Validate required parameters
      if (!token) {
        throw new ApiError(400, 'Missing required parameter: token');
      }
      
      // Get the price
      const price = await services.priceTracker.getPrice(token as string);
      
      if (price === null) {
        throw new ApiError(404, `Price not available for token: ${token}`);
      }
      
      // Return the price
      res.status(200).json({
        success: true,
        token,
        price,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get price history for a token
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getPriceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, timeframe } = req.query;
      
      // Validate required parameters
      if (!token) {
        throw new ApiError(400, 'Missing required parameter: token');
      }
      
      // Default timeframe to '24h' if not provided
      const tf = (timeframe as string) || '24h';
      
      // Get the price history
      const history = await services.priceTracker.getPriceHistory(token as string, tf);
      
      if (!history) {
        throw new ApiError(404, `Price history not available for token: ${token}`);
      }
      
      // Return the price history
      res.status(200).json({
        success: true,
        token,
        timeframe: tf,
        history
      });
    } catch (error) {
      next(error);
    }
  }
} 