import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';

/**
 * Price Controller
 * Handles price-related operations
 */
export class PriceController {
  /**
   * Get price for a token
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token address is required');
      }
      
      const price = await services.priceTracker.getPrice(token);
      
      res.status(200).json({
        success: price !== null,
        price,
        token
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get price from a specific provider
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getPriceFromProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, provider } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token address is required');
      }
      
      if (!provider || typeof provider !== 'string') {
        throw new ApiError(400, 'Provider name is required');
      }
      
      let price = null;
      
      // Get price from the specified provider
      switch (provider.toLowerCase()) {
        case 'jupiter':
          try {
            const jupiterProvider = services.priceTracker.getProviderByName('Jupiter');
            if (jupiterProvider) {
              price = await jupiterProvider.getPrice(token);
            }
          } catch (error) {
            console.error('Error getting price from Jupiter provider:', error);
          }
          break;
        case 'raydium':
          try {
            const raydiumProvider = services.priceTracker.getProviderByName('Raydium');
            if (raydiumProvider) {
              price = await raydiumProvider.getPrice(token);
            }
          } catch (error) {
            console.error('Error getting price from Raydium provider:', error);
          }
          break;
        case 'serum':
          try {
            const serumProvider = services.priceTracker.getProviderByName('Serum');
            if (serumProvider) {
              price = await serumProvider.getPrice(token);
            }
          } catch (error) {
            console.error('Error getting price from Serum provider:', error);
          }
          break;
        default:
          throw new ApiError(400, `Unknown provider: ${provider}`);
      }
      
      res.status(200).json({
        success: price !== null,
        price,
        token,
        provider
      });
    } catch (error) {
      next(error);
    }
  }
} 