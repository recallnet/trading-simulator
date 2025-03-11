import { Router } from 'express';
import { DocsController } from '../controllers/docs.controller';

const router = Router();

// GET /api/docs - Get API documentation
router.get('/', DocsController.getApiDocs);

export default router; 