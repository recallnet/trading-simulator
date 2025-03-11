import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';

/**
 * Trade Controller
 * Handles trade-related operations
 */
export class TradeController {
  /**
   * Execute a trade between two tokens
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async executeTrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { fromToken, toToken, amount, slippageTolerance } = req.body;
      const teamId = req.teamId as string;
      const competitionId = req.competitionId as string;
      
      // Validate required parameters
      if (!fromToken || !toToken || !amount) {
        throw new ApiError(400, 'Missing required parameters: fromToken, toToken, amount');
      }
      
      // Validate amount is a number
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new ApiError(400, 'Amount must be a positive number');
      }
      
      // Execute the trade
      const result = await services.tradeSimulator.executeTrade(
        teamId,
        competitionId,
        fromToken,
        toToken,
        parsedAmount,
        slippageTolerance
      );
      
      if (!result.success) {
        throw new ApiError(400, result.error || 'Trade execution failed');
      }
      
      // Return successful trade result
      res.status(200).json({
        success: true,
        trade: result.trade
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a quote for a trade
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { fromToken, toToken, amount } = req.query;
      
      // Validate required parameters
      if (!fromToken || !toToken || !amount) {
        throw new ApiError(400, 'Missing required parameters: fromToken, toToken, amount');
      }
      
      // Validate amount is a number
      const parsedAmount = parseFloat(amount as string);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new ApiError(400, 'Amount must be a positive number');
      }
      
      // Get token prices
      const fromPrice = await services.priceTracker.getPrice(fromToken as string);
      const toPrice = await services.priceTracker.getPrice(toToken as string);
      
      if (!fromPrice || !toPrice) {
        throw new ApiError(400, 'Unable to determine price for tokens');
      }
      
      // Calculate the trade
      const fromValueUSD = parsedAmount * fromPrice;
      
      // Apply slippage based on trade size
      const baseSlippage = (fromValueUSD / 10000) * 0.5; // 0.5% per $10,000
      const actualSlippage = baseSlippage * (0.8 + (Math.random() * 0.4)); // ±20% randomness
      const slippagePercentage = actualSlippage * 100;
      
      // Calculate final amount with slippage
      const effectiveFromValueUSD = fromValueUSD * (1 - actualSlippage);
      const toAmount = effectiveFromValueUSD / toPrice;
      
      // Return quote
      res.status(200).json({
        fromToken,
        toToken,
        fromAmount: parsedAmount,
        toAmount,
        exchangeRate: toAmount / parsedAmount,
        slippage: slippagePercentage,
        prices: {
          fromToken: fromPrice,
          toToken: toPrice
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 