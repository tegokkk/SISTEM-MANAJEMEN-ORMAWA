import { Router } from 'express';
import { ApplicationsController } from './applications.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Publicly available (but authenticated user)
router.post('/', requireAuth, ApplicationsController.create);
router.patch('/:id/submit', requireAuth, ApplicationsController.submit);
router.get('/:id', requireAuth, ApplicationsController.findOne);

// Admin / HMJ only
router.get('/', requireAuth, ApplicationsController.list);
router.post('/:id/review', requireAuth, ApplicationsController.review);

export default router;
