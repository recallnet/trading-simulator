import { Router } from 'express';
import { TradeController } from '../controllers/trade.controller';

const router = Router();

// POST /api/trade/execute - Execute a trade
router.post('/execute', TradeController.executeTrade);

// GET /api/trade/quote - Get a quote for a trade
router.get('/quote', TradeController.getQuote);

export default router; 