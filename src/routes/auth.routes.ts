import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/login - Login with API key and secret
router.post('/login', AuthController.login);

// POST /api/auth/validate - Validate API credentials
router.post('/validate', AuthController.validate);

export default router; 