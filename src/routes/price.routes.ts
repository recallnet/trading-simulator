import { Router } from 'express';
import { PriceController } from '../controllers/price.controller';

export const priceRoutes = Router();

// GET /api/price - Get price for a token
priceRoutes.get('/', PriceController.getPrice);

// GET /api/price/token-info - Get detailed token information including specific chain
priceRoutes.get('/token-info', PriceController.getTokenInfo);

export default priceRoutes; 