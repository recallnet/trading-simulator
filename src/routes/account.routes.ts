import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';

const router = Router();

// GET /api/account/profile - Get profile for the authenticated team
router.get('/profile', AccountController.getProfile);

// PUT /api/account/profile - Update profile for the authenticated team
router.put('/profile', AccountController.updateProfile);

// GET /api/account/balances - Get balances for the authenticated team
router.get('/balances', AccountController.getBalances);

// GET /api/account/portfolio - Get portfolio information for the authenticated team
router.get('/portfolio', AccountController.getPortfolio);

// GET /api/account/trades - Get trade history for the authenticated team
router.get('/trades', AccountController.getTrades);

export default router; 