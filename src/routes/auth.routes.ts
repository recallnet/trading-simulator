import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login with API key and secret
 *     description: Authenticates a team using their API key and secret, returning a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *               - apiSecret
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: Team's API key
 *               apiSecret:
 *                 type: string
 *                 description: Team's API secret
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 teamId:
 *                   type: string
 *                   description: Team ID
 *                 expiresIn:
 *                   type: string
 *                   description: Token expiration time in seconds
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /api/auth/validate:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Validate API credentials
 *     description: Validates the provided API key and secret without returning a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *               - apiSecret
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: Team's API key
 *               apiSecret:
 *                 type: string
 *                 description: Team's API secret
 *     responses:
 *       200:
 *         description: Credentials are valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Whether the credentials are valid
 *                   example: true
 *                 teamId:
 *                   type: string
 *                   description: Team ID if credentials are valid
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/validate', AuthController.validate);

export default router; 