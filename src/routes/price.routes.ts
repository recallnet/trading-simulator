import { Router } from 'express';
import { PriceController } from '../controllers/price.controller';

const router = Router();

// GET /api/price/current - Get current price for a token
router.get('/current', PriceController.getCurrentPrice);

// GET /api/price/history - Get price history for a token
router.get('/history', PriceController.getPriceHistory);

export default router; 