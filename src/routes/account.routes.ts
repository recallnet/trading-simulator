import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';

const router = Router();

// GET /api/account/balances - Get balances for the authenticated team
router.get('/balances', AccountController.getBalances);

// GET /api/account/portfolio - Get portfolio information for the authenticated team
router.get('/portfolio', AccountController.getPortfolio);

// GET /api/account/trades - Get trade history for the authenticated team
router.get('/trades', AccountController.getTrades);

export default router; 