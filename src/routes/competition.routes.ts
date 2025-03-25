import { Router } from 'express';
import { CompetitionController } from '../controllers/competition.controller';

const router = Router();

/**
 * @openapi
 * /api/competition/leaderboard:
 *   get:
 *     tags:
 *       - Competition
 *     summary: Get competition leaderboard
 *     description: Get the leaderboard for the active competition or a specific competition
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
 *         name: competitionId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional competition ID (if not provided, the active competition is used)
 *     responses:
 *       200:
 *         description: Competition leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 competition:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Competition ID
 *                     name:
 *                       type: string
 *                       description: Competition name
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: Competition description
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Competition start date
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Competition end date
 *                     status:
 *                       type: string
 *                       enum: [PENDING, ACTIVE, COMPLETED]
 *                       description: Competition status
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the competition was created
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the competition was last updated
 *                 leaderboard:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rank:
 *                         type: integer
 *                         description: Team rank on the leaderboard
 *                       teamId:
 *                         type: string
 *                         description: Team ID
 *                       teamName:
 *                         type: string
 *                         description: Team name
 *                       portfolioValue:
 *                         type: number
 *                         description: Current portfolio value in USD
 *       400:
 *         description: Bad request - No active competition and no competitionId provided
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       403:
 *         description: Forbidden - Team not participating in the competition
 *       404:
 *         description: Competition not found
 *       500:
 *         description: Server error
 */
router.get('/leaderboard', CompetitionController.getLeaderboard);

/**
 * @openapi
 * /api/competition/status:
 *   get:
 *     tags:
 *       - Competition
 *     summary: Get competition status
 *     description: Get the status of the active competition
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
 *         description: Competition status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 active:
 *                   type: boolean
 *                   description: Whether there is an active competition
 *                 competition:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Competition ID
 *                     name:
 *                       type: string
 *                       description: Competition name
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       description: Competition description
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       description: Competition start date
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       description: Competition end date
 *                     status:
 *                       type: string
 *                       enum: [PENDING, ACTIVE, COMPLETED]
 *                       description: Competition status
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the competition was created
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: When the competition was last updated
 *                 message:
 *                   type: string
 *                   description: Additional information about the competition status
 *                   nullable: true
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
router.get('/status', CompetitionController.getStatus);

/**
 * @openapi
 * /api/competition/rules:
 *   get:
 *     tags:
 *       - Competition
 *     summary: Get competition rules
 *     description: Get the rules for all competitions
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
 *         description: Competition rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Operation success status
 *                 rules:
 *                   type: object
 *                   properties:
 *                     tradingRules:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of trading rules
 *                     rateLimits:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of rate limits
 *                     slippageFormula:
 *                       type: string
 *                       description: Formula used to calculate slippage
 *       401:
 *         description: Unauthorized - Missing or invalid authentication (API key, timestamp, or signature)
 *       500:
 *         description: Server error
 */
router.get('/rules', CompetitionController.getRules);

export default router; 