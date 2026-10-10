import { Router } from 'express';
import { searchPolicy } from '../controllers/policyController.js';

const router = Router();

router.get('/search', searchPolicy);

export default router;
