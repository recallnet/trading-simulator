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
   *
   * @openapi
   * /api/trade/execute:
   *   post:
   *     tags:
   *       - Trade
   *     summary: Execute a trade
   *     description: Execute a trade between two tokens. Supports cross-chain trading when enabled in configuration.
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fromToken
   *               - toToken
   *               - amount
   *             properties:
   *               fromToken:
   *                 type: string
   *                 description: Source token address or identifier
   *                 example: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   *               toToken:
   *                 type: string
   *                 description: Destination token address or identifier
   *                 example: So11111111111111111111111111111111111111112
   *               amount:
   *                 type: string
   *                 description: Amount of fromToken to trade (as string to preserve precision)
   *                 example: "100.5"
   *               slippageTolerance:
   *                 type: string
   *                 description: Optional slippage tolerance percentage (e.g., "0.5" for 0.5%)
   *                 example: "0.5"
   *               fromChain:
   *                 type: string
   *                 enum: [evm, svm]
   *                 description: Optional blockchain type for source token
   *               fromSpecificChain:
   *                 type: string
   *                 enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
   *                 description: Optional specific chain for source token
   *               toChain:
   *                 type: string
   *                 enum: [evm, svm]
   *                 description: Optional blockchain type for destination token
   *               toSpecificChain:
   *                 type: string
   *                 enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
   *                 description: Optional specific chain for destination token
   *     responses:
   *       200:
   *         description: Trade executed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 transaction:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Trade ID
   *                     teamId:
   *                       type: string
   *                       description: Team ID
   *                     competitionId:
   *                       type: string
   *                       description: Competition ID
   *                     fromToken:
   *                       type: string
   *                       description: Source token address
   *                     toToken:
   *                       type: string
   *                       description: Destination token address
   *                     fromAmount:
   *                       type: number
   *                       description: Amount of source token traded
   *                     toAmount:
   *                       type: number
   *                       description: Amount of destination token received
   *                     price:
   *                       type: number
   *                       description: Price at which the trade was executed
   *                     success:
   *                       type: boolean
   *                       description: Whether the trade was successfully completed
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *                       description: Trade timestamp
   *                     status:
   *                       type: string
   *                       enum: [success, failed]
   *                       description: Trade status
   *                     error:
   *                       type: string
   *                       nullable: true
   *                       description: Error message if trade failed
   *                     fromTokenChain:
   *                       type: string
   *                       description: Blockchain type of source token
   *                     toTokenChain:
   *                       type: string
   *                       description: Blockchain type of destination token
   *                     fromSpecificChain:
   *                       type: string
   *                       nullable: true
   *                       description: Specific chain of source token
   *                     toSpecificChain:
   *                       type: string
   *                       nullable: true
   *                       description: Specific chain of destination token
   *       400:
   *         description: Missing parameters, invalid amount, or trade execution failed
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Forbidden - Competition not in progress or other restrictions
   *       500:
   *         description: Server error
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async executeTrade(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        fromToken,
        toToken,
        amount,
        slippageTolerance,
        // New parameters for chain specification
        fromChain,
        fromSpecificChain,
        toChain,
        toSpecificChain,
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
        throw new ApiError(
          400,
          'Missing competitionId: No active competition or competition ID not set',
        );
      }

      console.log(`[TradeController] Executing trade with competition ID: ${competitionId}`);

      // Create chain options object if any chain parameters were provided
      const chainOptions =
        fromChain || fromSpecificChain || toChain || toSpecificChain
          ? {
              fromChain,
              fromSpecificChain,
              toChain,
              toSpecificChain,
            }
          : undefined;

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
        chainOptions,
      );

      if (!result.success) {
        throw new ApiError(400, result.error || 'Trade execution failed');
      }

      // Return successful trade result
      res.status(200).json({
        success: true,
        transaction: result.trade,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a quote for a trade
   *
   * @openapi
   * /api/trade/quote:
   *   get:
   *     tags:
   *       - Trade
   *     summary: Get trade quote
   *     description: Get a quote for a trade between two tokens without executing it. Includes price information and estimated slippage.
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: fromToken
   *         required: true
   *         schema:
   *           type: string
   *         description: Source token address or identifier
   *       - in: query
   *         name: toToken
   *         required: true
   *         schema:
   *           type: string
   *         description: Destination token address or identifier
   *       - in: query
   *         name: amount
   *         required: true
   *         schema:
   *           type: string
   *         description: Amount of fromToken to trade (as string to preserve precision)
   *       - in: query
   *         name: fromChain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [evm, svm]
   *         description: Optional blockchain type for source token
   *       - in: query
   *         name: fromSpecificChain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
   *         description: Optional specific chain for source token
   *       - in: query
   *         name: toChain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [evm, svm]
   *         description: Optional blockchain type for destination token
   *       - in: query
   *         name: toSpecificChain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
   *         description: Optional specific chain for destination token
   *     responses:
   *       200:
   *         description: Quote generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 fromToken:
   *                   type: string
   *                   description: Source token address or identifier
   *                 toToken:
   *                   type: string
   *                   description: Destination token address or identifier
   *                 fromAmount:
   *                   type: number
   *                   description: Amount of source token to trade
   *                 toAmount:
   *                   type: number
   *                   description: Estimated amount of destination token to receive
   *                 exchangeRate:
   *                   type: number
   *                   description: Exchange rate (toAmount / fromAmount)
   *                 slippage:
   *                   type: number
   *                   description: Estimated slippage percentage
   *                 prices:
   *                   type: object
   *                   properties:
   *                     fromToken:
   *                       type: number
   *                       description: Current price of source token in USD
   *                     toToken:
   *                       type: number
   *                       description: Current price of destination token in USD
   *                 chains:
   *                   type: object
   *                   properties:
   *                     fromChain:
   *                       type: string
   *                       enum: [evm, svm]
   *                       description: Blockchain type of source token
   *                     toChain:
   *                       type: string
   *                       enum: [evm, svm]
   *                       description: Blockchain type of destination token
   *       400:
   *         description: Missing parameters, invalid amount, or unable to determine price
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Server error
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        fromToken,
        toToken,
        amount,
        // Chain parameters
        fromChain,
        fromSpecificChain,
        toChain,
        toSpecificChain,
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
        fromTokenSpecificChain,
      );

      const toPrice = await services.priceTracker.getPrice(
        toToken as string,
        toTokenChain,
        toTokenSpecificChain,
      );

      if (!fromPrice || !toPrice) {
        throw new ApiError(400, 'Unable to determine price for tokens');
      }

      // Calculate the trade
      const fromValueUSD = parsedAmount * fromPrice;

      // Apply slippage based on trade size
      const baseSlippage = (fromValueUSD / 10000) * 0.05; // 0.05% per $10,000 (10x lower than before)
      const actualSlippage = baseSlippage * (0.9 + Math.random() * 0.2); // ±10% randomness (reduced from ±20%)
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
          toToken: toPrice,
        },
        chains: {
          fromChain: fromTokenChain || services.priceTracker.determineChain(fromToken as string),
          toChain: toTokenChain || services.priceTracker.determineChain(toToken as string),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
