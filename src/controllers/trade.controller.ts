import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';
import { BlockchainType, SpecificChain } from '../types';

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
      const { 
        fromToken, toToken, amount, slippageTolerance,
        // New parameters for chain specification
        fromChain, fromSpecificChain, toChain, toSpecificChain 
      } = req.body;
      
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
      
      // Validate that we have a competition ID
      if (!competitionId) {
        throw new ApiError(400, 'Missing competitionId: No active competition or competition ID not set');
      }
      
      console.log(`[TradeController] Executing trade with competition ID: ${competitionId}`);
      
      // Create chain options object if any chain parameters were provided
      const chainOptions = (fromChain || fromSpecificChain || toChain || toSpecificChain) ? {
        fromChain,
        fromSpecificChain,
        toChain,
        toSpecificChain
      } : undefined;
      
      // Log chain options if provided
      if (chainOptions) {
        console.log(`[TradeController] Using chain options:`, JSON.stringify(chainOptions));
      }
      
      // Execute the trade with optional chain parameters
      const result = await services.tradeSimulator.executeTrade(
        teamId,
        competitionId,
        fromToken,
        toToken,
        parsedAmount,
        slippageTolerance,
        chainOptions
      );
      
      if (!result.success) {
        throw new ApiError(400, result.error || 'Trade execution failed');
      }
      
      // Return successful trade result
      res.status(200).json({
        success: true,
        transaction: result.trade
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
      const { 
        fromToken, toToken, amount,
        // Chain parameters 
        fromChain, fromSpecificChain, toChain, toSpecificChain
      } = req.query;
      
      // Validate required parameters
      if (!fromToken || !toToken || !amount) {
        throw new ApiError(400, 'Missing required parameters: fromToken, toToken, amount');
      }
      
      // Validate amount is a number
      const parsedAmount = parseFloat(amount as string);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new ApiError(400, 'Amount must be a positive number');
      }
      
      // Determine chains for from/to tokens
      let fromTokenChain: BlockchainType | undefined;
      let fromTokenSpecificChain: SpecificChain | undefined;
      let toTokenChain: BlockchainType | undefined;
      let toTokenSpecificChain: SpecificChain | undefined;
      
      // Parse chain parameters if provided
      if (fromChain) {
        fromTokenChain = fromChain as BlockchainType;
      }
      if (fromSpecificChain) {
        fromTokenSpecificChain = fromSpecificChain as SpecificChain;
      }
      if (toChain) {
        toTokenChain = toChain as BlockchainType;
      }
      if (toSpecificChain) {
        toTokenSpecificChain = toSpecificChain as SpecificChain;
      }
      
      // Log chain information if provided
      if (fromTokenChain || fromTokenSpecificChain || toTokenChain || toTokenSpecificChain) {
        console.log(`[TradeController] Quote with chain info:
          From Token Chain: ${fromTokenChain || 'auto'}, Specific Chain: ${fromTokenSpecificChain || 'auto'}
          To Token Chain: ${toTokenChain || 'auto'}, Specific Chain: ${toTokenSpecificChain || 'auto'}
        `);
      }
      
      // Get token prices with chain information for better performance
      const fromPrice = await services.priceTracker.getPrice(
        fromToken as string, 
        fromTokenChain,
        fromTokenSpecificChain
      );
      
      const toPrice = await services.priceTracker.getPrice(
        toToken as string,
        toTokenChain,
        toTokenSpecificChain
      );
      
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
      
      // Return quote with chain information
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
        },
        chains: {
          fromChain: fromTokenChain || services.priceTracker.determineChain(fromToken as string),
          toChain: toTokenChain || services.priceTracker.determineChain(toToken as string)
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 