import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

import { loginRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

router.post('/login', loginRateLimiter, authController.login);
router.post('/register', loginRateLimiter, authController.register);
router.post('/forgot-password', loginRateLimiter, authController.forgotPassword);
router.post('/reset-password', loginRateLimiter, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.post('/switch-tenant', requireAuth, authController.switchTenant);

export default router;
