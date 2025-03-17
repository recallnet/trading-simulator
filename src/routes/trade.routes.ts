import { Router } from 'express';
import { TradeController } from '../controllers/trade.controller';

const router = Router();

/**
 * POST /api/trade/execute - Execute a trade
 * 
 * Request Body: 
 * {
 *   "fromToken": "string", // Token address to sell
 *   "toToken": "string",   // Token address to buy
 *   "amount": "number",    // Amount of fromToken to trade
 *   "slippageTolerance": "number", // Optional slippage tolerance in percentage
 *   "fromChain": "string", // Optional - Blockchain type for fromToken (solana, ethereum, etc.)
 *   "fromSpecificChain": "string", // Optional - Specific chain for fromToken (mainnet, base, arbitrum, etc.)
 *   "toChain": "string",   // Optional - Blockchain type for toToken
 *   "toSpecificChain": "string"  // Optional - Specific chain for toToken
 * }
 */
router.post('/execute', TradeController.executeTrade);

/**
 * GET /api/trade/quote - Get a quote for a trade
 * 
 * Query Parameters:
 * - fromToken: string - Token address to sell
 * - toToken: string - Token address to buy
 * - amount: number - Amount of fromToken to get quote for
 * - fromChain: string - Optional blockchain type for fromToken
 * - fromSpecificChain: string - Optional specific chain for fromToken
 * - toChain: string - Optional blockchain type for toToken
 * - toSpecificChain: string - Optional specific chain for toToken
 */
router.get('/quote', TradeController.getQuote);

export default router; 