import { Router } from 'express';
import { testAiConnection } from '../controllers/aiController.js';

const router = Router();

router.get('/test', testAiConnection);

export default router;
