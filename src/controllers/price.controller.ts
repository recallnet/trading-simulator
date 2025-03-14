import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';
import { BlockchainType, SpecificChain } from '../types';
import { NovesProvider } from '../services/providers/noves.provider';
import { MultiChainProvider } from '../services/providers/multi-chain.provider';

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
      const { token, chain: requestedChain, specificChain: requestedSpecificChain } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token address is required');
      }
      
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
   * @param req Express request
   * @param res Express response
   * @param next Express next function 
   */
  static async getTokenInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, chain: requestedChain, specificChain: requestedSpecificChain } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token address is required');
      }
      
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
  
  /**
   * Get price from a specific provider
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getPriceFromProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, provider, chain: requestedChain, specificChain: requestedSpecificChain } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new ApiError(400, 'Token address is required');
      }
      
      if (!provider || typeof provider !== 'string') {
        throw new ApiError(400, 'Provider name is required');
      }
      
      // Determine the chain, using the requested chain if provided
      let chain: BlockchainType;
      if (requestedChain === 'svm') {
        chain = BlockchainType.SVM;
      } else if (requestedChain === 'evm') {
        chain = BlockchainType.EVM;
      } else {
        chain = services.priceTracker.determineChain(token);
      }
      
      // Determine specific chain if provided
      let specificChain: SpecificChain | undefined = undefined;
      if (typeof requestedSpecificChain === 'string' && 
          ['eth', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche', 'base', 'linea', 'zksync', 'scroll', 'mantle', 'svm'].includes(requestedSpecificChain)) {
        specificChain = requestedSpecificChain as SpecificChain;
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
        case 'noves':
          try {
            const novesProvider = services.priceTracker.getProviderByName('Noves');
            if (novesProvider) {
              // Cast to NovesProvider to use the overloaded method with chain parameter
              price = await (novesProvider as unknown as NovesProvider).getPrice(token, chain);
            }
          } catch (error) {
            console.error('Error getting price from Noves provider:', error);
          }
          break;
        case 'multi-chain':
        case 'multichain':
        case 'noves-multi-chain':
          try {
            const multiChainProvider = services.priceTracker.getProviderByName('Noves MultiChain');
            if (multiChainProvider && chain === BlockchainType.EVM) {
              // For multi-chain provider, we can get detailed token info
              // Pass specificChain to the MultiChainProvider if provided
              const tokenInfo = await (multiChainProvider as unknown as MultiChainProvider).getTokenInfo(
                token, 
                chain,
                specificChain
              );
              
              if (tokenInfo) {
                price = tokenInfo.price;
                specificChain = tokenInfo.specificChain || undefined;
              }
            }
          } catch (error) {
            console.error('Error getting price from MultiChain provider:', error);
          }
          break;
        default:
          throw new ApiError(400, `Unknown provider: ${provider}`);
      }
      
      res.status(200).json({
        success: price !== null,
        price,
        token,
        provider,
        chain,
        specificChain
      });
    } catch (error) {
      next(error);
    }
  }
} 