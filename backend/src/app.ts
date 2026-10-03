import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';
import { verifyMutationOrigin } from './middleware/origin.middleware';
import { requestId } from './middleware/request-id.middleware';
import { ApiResponse } from './utils/ApiResponse';
import authRoutes from './modules/auth/auth.routes';
import applicationRoutes from './modules/tenant-applications/applications.routes';
import referenceRoutes from './modules/references/references.routes';
import publicDirectoryRoutes from './modules/public-directory/public-directory.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import auditRoutes from './modules/audit/audit.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import memberRoutes from './modules/members/members.routes';
import organizationRoutes from './modules/organization/organization.routes';
import workProgramRoutes from './modules/work-programs/work-programs.routes';
import requirementRoutes from './modules/requirements/requirements.routes';
import financeRequestRoutes from './modules/finance-requests/finance-requests.routes';
import financeRoutes from './modules/finance/finance.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import tenantRoutes from './modules/tenants/tenants.routes';
import fileRoutes from './modules/files/files.routes';
import { prisma } from './core/prisma';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(apiRateLimiter);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(verifyMutationOrigin);

  app.get('/health', (_req, res) => {
    res.status(200).json(ApiResponse.success({ status: 'ok', timestamp: new Date().toISOString() }, 'Service sehat'));
  });
  app.get('/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json(ApiResponse.success({ status: 'ready', database: 'connected' }, 'Service siap'));
    } catch (error) {
      logger.error({ error }, 'Database readiness check failed');
      res.status(503).json(ApiResponse.error('Service belum siap', undefined, 'SERVICE_UNAVAILABLE'));
    }
  });
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/applications', applicationRoutes);
  app.use('/api/v1/references', referenceRoutes);
  app.use('/api/v1/public', publicDirectoryRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/members', memberRoutes);
  app.use('/api/v1/organization', organizationRoutes);
  app.use('/api/v1/work-programs', workProgramRoutes);
  app.use('/api/v1/requirements', requirementRoutes);
  app.use('/api/v1/finance-requests', financeRequestRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/messaging', messagingRoutes);
  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/v1/files', fileRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
