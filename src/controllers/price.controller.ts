import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';
import { BlockchainType, SpecificChain } from '../types';

/**
 * Price Controller
 * Handles price-related operations
 */
export class PriceController {
  /**
   * Get price for a token
   * 
   * @openapi
   * /api/price:
   *   get:
   *     tags:
   *       - Price
   *     summary: Get token price
   *     description: Get the current price for a specific token. Can optionally specify chain type and specific chain for disambiguation.
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: token
   *         required: true
   *         schema:
   *           type: string
   *         description: Token address or identifier
   *       - in: query
   *         name: chain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [evm, svm]
   *         description: Blockchain type (evm or svm)
   *       - in: query
   *         name: specificChain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
   *         description: Specific blockchain for EVM tokens (eth, polygon, etc.)
   *     responses:
   *       200:
   *         description: Token price retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Whether price retrieval was successful
   *                 price:
   *                   type: number
   *                   nullable: true
   *                   description: Current token price in USD
   *                 token:
   *                   type: string
   *                   description: Token address or identifier
   *                 chain:
   *                   type: string
   *                   enum: [evm, svm]
   *                   description: Blockchain type
   *                 specificChain:
   *                   type: string
   *                   nullable: true
   *                   description: Specific chain for EVM tokens
   *       400:
   *         description: Missing or invalid token address
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Server error
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      const { token, chain: requestedChain, specificChain: requestedSpecificChain } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token address is required');
      }
      
      console.log(`[PriceController] Getting price for token ${token} requested by team ${teamId}`);
      
      // Determine the blockchain type for this token, using the requested chain if provided
      let blockchainType: BlockchainType;
      if (requestedChain === 'evm') {
        blockchainType = BlockchainType.EVM;
      } else if (requestedChain === 'svm') {
        blockchainType = BlockchainType.SVM;
      } else {
        blockchainType = services.priceTracker.determineChain(token);
      }
      
      // Determine specific chain if provided
      let specificChain: SpecificChain | undefined = undefined;
      if (typeof requestedSpecificChain === 'string' && 
          ['eth', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'base', 'linea', 'zksync', 'scroll', 'mantle', 'svm'].includes(requestedSpecificChain)) {
        specificChain = requestedSpecificChain as SpecificChain;
      }
      
      // For EVM tokens, try to get more detailed chain information
      if (blockchainType === BlockchainType.EVM) {
        // Pass both blockchainType and specificChain to getTokenInfo
        const tokenInfo = await services.priceTracker.getTokenInfo(
          token, 
          blockchainType, 
          specificChain
        );
        
        if (tokenInfo) {
          // Return with specific EVM chain (eth, polygon, base, etc.)
          return res.status(200).json({
            success: tokenInfo.price !== null,
            price: tokenInfo.price,
            token,
            chain: blockchainType,
            specificChain: tokenInfo.specificChain
          });
        }
      }
      
      // Get the price from price tracker for non-EVM tokens or if getTokenInfo failed
      // Pass both blockchainType and specificChain to getPrice
      const price = await services.priceTracker.getPrice(
        token, 
        blockchainType, 
        specificChain
      );
      
      res.status(200).json({
        success: price !== null,
        price,
        token,
        chain: blockchainType,
        specificChain: blockchainType === BlockchainType.SVM ? 'svm' : specificChain
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get detailed token information including specific chain (for EVM tokens)
   * 
   * @openapi
   * /api/price/token-info:
   *   get:
   *     tags:
   *       - Price
   *     summary: Get detailed token information
   *     description: Get detailed token information including price and specific chain information
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: token
   *         required: true
   *         schema:
   *           type: string
   *         description: Token address or identifier
   *       - in: query
   *         name: chain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [evm, svm]
   *         description: Blockchain type (evm or svm)
   *       - in: query
   *         name: specificChain
   *         required: false
   *         schema:
   *           type: string
   *           enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
   *         description: Specific blockchain for EVM tokens (eth, polygon, etc.)
   *     responses:
   *       200:
   *         description: Token information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Whether token information retrieval was successful
   *                 price:
   *                   type: number
   *                   nullable: true
   *                   description: Current token price in USD
   *                 token:
   *                   type: string
   *                   description: Token address or identifier
   *                 chain:
   *                   type: string
   *                   enum: [evm, svm]
   *                   description: Blockchain type
   *                 specificChain:
   *                   type: string
   *                   nullable: true
   *                   description: Specific chain for EVM tokens
   *                   example: eth
   *       400:
   *         description: Missing or invalid token address
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Server error
   *
   * @param req Express request
   * @param res Express response
   * @param next Express next function 
   */
  static async getTokenInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      const { token, chain: requestedChain, specificChain: requestedSpecificChain } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token address is required');
      }
      
      console.log(`[PriceController] Getting token info for ${token} requested by team ${teamId}`);
      
      // Determine blockchain type using the requested chain if provided
      let blockchainType: BlockchainType;
      if (requestedChain === 'evm') {
        blockchainType = BlockchainType.EVM;
      } else if (requestedChain === 'svm') {
        blockchainType = BlockchainType.SVM;
      } else {
        blockchainType = services.priceTracker.determineChain(token);
      }
      
      // Determine specific chain if provided
      let specificChain: SpecificChain | undefined = undefined;
      if (typeof requestedSpecificChain === 'string' && 
          ['eth', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'base', 'linea', 'zksync', 'scroll', 'mantle', 'svm'].includes(requestedSpecificChain)) {
        specificChain = requestedSpecificChain as SpecificChain;
      }
      
      // Get detailed token info (for both EVM and SVM tokens)
      // Pass both blockchainType and specificChain to getTokenInfo
      const tokenInfo = await services.priceTracker.getTokenInfo(
        token, 
        blockchainType, 
        specificChain
      );
      
      if (!tokenInfo) {
        return res.status(200).json({
          success: false,
          price: null,
          token,
          chain: blockchainType,
          specificChain: null
        });
      }
      
      res.status(200).json({
        success: tokenInfo.price !== null,
        price: tokenInfo.price,
        token,
        chain: blockchainType,
        specificChain: tokenInfo.specificChain
      });
    } catch (error) {
      next(error);
    }
  }
} 