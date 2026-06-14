import { createApp } from '@/application/app';
import { env } from '@/application/shared/env';
import { logger } from '@/application/shared/logger';
import { CassandraClient } from '@/infra/cassandra/client';
import { RedisClient } from '@/infra/redis/client';

async function bootstrap(): Promise<void> {
  const cassandra = new CassandraClient();
  const redis = new RedisClient();

  await Promise.all([cassandra.connect(), redis.connect()]);

  const app = createApp();

  Bun.serve({ fetch: app.fetch, port: env.PORT });
  logger.info({ port: env.PORT, env: env.ENV }, 'Server started');

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down gracefully');
    await Promise.all([cassandra.shutdown(), redis.shutdown()]);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
