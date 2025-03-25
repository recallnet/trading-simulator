import { Router } from 'express';
import { TradeController } from '../controllers/trade.controller';

const router = Router();

/**
 * @openapi
 * /api/trade/execute:
 *   post:
 *     tags:
 *       - Trade
 *     summary: Execute a trade
 *     description: Execute a trade between two tokens
 *     security:
 *       - ApiKeyAuth: []
 *       - TimestampAuth: []
 *       - SignatureAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Timestamp
 *         schema:
 *           type: string
 *         required: true
 *         description: Current timestamp in ISO format
 *         example: "2023-03-15T17:30:45.123Z"
 *       - in: header
 *         name: X-API-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: API key for authentication
 *         example: "sk_1b2c3d4e5f"
 *       - in: header
 *         name: X-Signature
 *         schema:
 *           type: string
 *         required: true
 *         description: HMAC-SHA256 signature of request data
 *         example: "a1b2c3d4e5f6..."
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
 *                 description: Token address to sell
 *                 example: "So11111111111111111111111111111111111111112"
 *               toToken:
 *                 type: string
 *                 description: Token address to buy
 *                 example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 *               amount:
 *                 type: string
 *                 description: Amount of fromToken to trade
 *                 example: "1.5"
 *               slippageTolerance:
 *                 type: string
 *                 description: Optional slippage tolerance in percentage
 *                 example: "0.5"
 *               fromChain:
 *                 type: string
 *                 description: Optional - Blockchain type for fromToken
 *                 example: "svm"
 *               fromSpecificChain:
 *                 type: string
 *                 description: Optional - Specific chain for fromToken
 *                 example: "mainnet"
 *               toChain:
 *                 type: string
 *                 description: Optional - Blockchain type for toToken
 *                 example: "svm"
 *               toSpecificChain:
 *                 type: string
 *                 description: Optional - Specific chain for toToken
 *                 example: "mainnet"
 *     responses:
 *       200:
 *         description: Trade executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trade'
 *       400:
 *         description: Invalid input parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       403:
 *         description: Forbidden - Competition not in progress or other restrictions
 *       500:
 *         description: Server error
 */
router.post('/execute', TradeController.executeTrade);

/**
 * @openapi
 * /api/trade/quote:
 *   get:
 *     tags:
 *       - Trade
 *     summary: Get a quote for a trade
 *     description: Get a quote for a potential trade between two tokens
 *     security:
 *       - ApiKeyAuth: []
 *       - TimestampAuth: []
 *       - SignatureAuth: []
 *     parameters:
 *       - in: header
 *         name: X-Timestamp
 *         schema:
 *           type: string
 *         required: true
 *         description: Current timestamp in ISO format
 *         example: "2023-03-15T17:30:45.123Z"
 *       - in: header
 *         name: X-API-Key
 *         schema:
 *           type: string
 *         required: true
 *         description: API key for authentication
 *         example: "sk_1b2c3d4e5f"
 *       - in: header
 *         name: X-Signature
 *         schema:
 *           type: string
 *         required: true
 *         description: HMAC-SHA256 signature of request data
 *         example: "a1b2c3d4e5f6..."
 *       - in: query
 *         name: fromToken
 *         schema:
 *           type: string
 *         required: true
 *         description: Token address to sell
 *         example: So11111111111111111111111111111111111111112
 *       - in: query
 *         name: toToken
 *         schema:
 *           type: string
 *         required: true
 *         description: Token address to buy
 *         example: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 *       - in: query
 *         name: amount
 *         schema:
 *           type: string
 *         required: true
 *         description: Amount of fromToken to get quote for
 *         example: 1.5
 *       - in: query
 *         name: fromChain
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional blockchain type for fromToken
 *         example: svm
 *       - in: query
 *         name: fromSpecificChain
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional specific chain for fromToken
 *         example: mainnet
 *       - in: query
 *         name: toChain
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional blockchain type for toToken
 *         example: svm
 *       - in: query
 *         name: toSpecificChain
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional specific chain for toToken
 *         example: mainnet
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
 *                   description: Token address being sold
 *                 toToken:
 *                   type: string
 *                   description: Token address being bought
 *                 fromAmount:
 *                   type: string
 *                   description: Amount of fromToken to be sold
 *                 toAmount:
 *                   type: string
 *                   description: Estimated amount of toToken to be received
 *                 price:
 *                   type: string
 *                   description: Effective price for the trade
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp of when the quote was generated
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
router.get('/quote', TradeController.getQuote);

export default router; 