import { Router } from 'express';
import { PriceController } from '../controllers/price.controller';

export const priceRoutes = Router();

/**
 * @openapi
 * /api/price:
 *   get:
 *     tags:
 *       - Price
 *     summary: Get price for a token
 *     description: Get the current price of a specified token
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
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token address
 *         example: So11111111111111111111111111111111111111112
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *           enum: [evm, svm]
 *         required: false
 *         description: Blockchain type of the token
 *         example: svm
 *       - in: query
 *         name: specificChain
 *         schema:
 *           type: string
 *           enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
 *         required: false
 *         description: Specific chain for EVM tokens
 *         example: eth
 *     responses:
 *       200:
 *         description: Token price information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the price was successfully retrieved
 *                 price:
 *                   type: number
 *                   nullable: true
 *                   description: Current price of the token in USD
 *                 token:
 *                   type: string
 *                   description: Token address
 *                 chain:
 *                   type: string
 *                   enum: [EVM, SVM]
 *                   description: Blockchain type of the token
 *                 specificChain:
 *                   type: string
 *                   nullable: true
 *                   description: Specific chain for EVM tokens
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
priceRoutes.get('/', PriceController.getPrice);

/**
 * @openapi
 * /api/price/token-info:
 *   get:
 *     tags:
 *       - Price
 *     summary: Get detailed token information
 *     description: Get detailed token information including price and specific chain
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
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token address
 *         example: So11111111111111111111111111111111111111112
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *           enum: [evm, svm]
 *         required: false
 *         description: Blockchain type of the token
 *         example: svm
 *       - in: query
 *         name: specificChain
 *         schema:
 *           type: string
 *           enum: [eth, polygon, bsc, arbitrum, optimism, avalanche, base, linea, zksync, scroll, mantle, svm]
 *         required: false
 *         description: Specific chain for EVM tokens
 *         example: eth
 *     responses:
 *       200:
 *         description: Token information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Whether the token information was successfully retrieved
 *                 price:
 *                   type: number
 *                   nullable: true
 *                   description: Current price of the token in USD
 *                 token:
 *                   type: string
 *                   description: Token address
 *                 chain:
 *                   type: string
 *                   enum: [EVM, SVM]
 *                   description: Blockchain type of the token
 *                 specificChain:
 *                   type: string
 *                   nullable: true
 *                   description: Specific chain for EVM tokens
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
priceRoutes.get('/token-info', PriceController.getTokenInfo);

export default priceRoutes; 