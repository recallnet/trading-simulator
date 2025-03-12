import { Router } from 'express';
import { PriceController } from '../controllers/price.controller';

export const priceRoutes = Router();

// GET /api/price - Get price for a token
priceRoutes.get('/', PriceController.getPrice);

// GET /api/price/provider - Get price from a specific provider
priceRoutes.get('/provider', PriceController.getPriceFromProvider);

export default priceRoutes; 