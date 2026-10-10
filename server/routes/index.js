import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import claimRoutes from './claimRoutes.js';
import policyRoutes from './policyRoutes.js';
import aiRoutes from './aiRoutes.js';
import authRoutes from './authRoutes.js';

const router = Router();

// Mount sub-routes
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/claims', claimRoutes);
router.use('/policy', policyRoutes);
router.use('/ai', aiRoutes);

export default router;
