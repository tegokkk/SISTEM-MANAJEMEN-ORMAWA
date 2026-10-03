import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './core/prisma';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'SIM ORMAWA API siap menerima permintaan');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Menghentikan server');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export { server };
