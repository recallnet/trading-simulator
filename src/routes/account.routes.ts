import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';

const router = Router();

/**
 * @openapi
 * /api/account/profile:
 *   get:
 *     tags:
 *       - Account
 *     summary: Get team profile
 *     description: Get profile information for the authenticated team
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
 *     responses:
 *       200:
 *         description: Team profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 team:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Team ID
 *                     name:
 *                       type: string
 *                       description: Team name
 *                     email:
 *                       type: string
 *                       description: Team email
 *                     contact_person:
 *                       type: string
 *                       description: Contact person name
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Team creation timestamp
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Team last update timestamp
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 */
router.get('/profile', AccountController.getProfile);

/**
 * @openapi
 * /api/account/profile:
 *   put:
 *     tags:
 *       - Account
 *     summary: Update team profile
 *     description: Update profile information for the authenticated team
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
 *             properties:
 *               contactPerson:
 *                 type: string
 *                 description: New contact person name
 *     responses:
 *       200:
 *         description: Updated team profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 team:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Team ID
 *                     name:
 *                       type: string
 *                       description: Team name
 *                     email:
 *                       type: string
 *                       description: Team email
 *                     contact_person:
 *                       type: string
 *                       description: Updated contact person name
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: Team creation timestamp
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Team update timestamp
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 */
router.put('/profile', AccountController.updateProfile);

/**
 * @openapi
 * /api/account/balances:
 *   get:
 *     tags:
 *       - Account
 *     summary: Get token balances
 *     description: Get all token balances for the authenticated team
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
 *     responses:
 *       200:
 *         description: Team token balances
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 teamId:
 *                   type: string
 *                   description: Team ID
 *                 balances:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       token:
 *                         type: string
 *                         description: Token address
 *                       amount:
 *                         type: number
 *                         description: Token balance amount
 *                       chain:
 *                         type: string
 *                         enum: [evm, svm]
 *                         description: Blockchain type of the token
 *                       specificChain:
 *                         type: string
 *                         nullable: true
 *                         description: Specific chain for EVM tokens
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
router.get('/balances', AccountController.getBalances);

/**
 * @openapi
 * /api/account/portfolio:
 *   get:
 *     tags:
 *       - Account
 *     summary: Get portfolio information
 *     description: Get portfolio valuation and token details for the authenticated team
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
 *     responses:
 *       200:
 *         description: Team portfolio information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 teamId:
 *                   type: string
 *                   description: Team ID
 *                 totalValue:
 *                   type: number
 *                   description: Total portfolio value in USD
 *                 tokens:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       token:
 *                         type: string
 *                         description: Token address
 *                       amount:
 *                         type: number
 *                         description: Token balance amount
 *                       price:
 *                         type: number
 *                         description: Current token price in USD
 *                       value:
 *                         type: number
 *                         description: Total value of token holdings in USD
 *                       chain:
 *                         type: string
 *                         enum: [evm, svm]
 *                         description: Blockchain type of the token
 *                       specificChain:
 *                         type: string
 *                         nullable: true
 *                         description: Specific chain for EVM tokens
 *                 snapshotTime:
 *                   type: string
 *                   format: date-time
 *                   description: Time of the snapshot (if source is 'snapshot')
 *                 source:
 *                   type: string
 *                   enum: [snapshot, live-calculation]
 *                   description: Source of the portfolio data
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
router.get('/portfolio', AccountController.getPortfolio);

/**
 * @openapi
 * /api/account/trades:
 *   get:
 *     tags:
 *       - Account
 *     summary: Get trade history
 *     description: Get trade history for the authenticated team
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
 *     responses:
 *       200:
 *         description: Team trade history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 teamId:
 *                   type: string
 *                   description: Team ID
 *                 trades:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trade'
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
router.get('/trades', AccountController.getTrades);

export default router; 