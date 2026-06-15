import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppBindings, AppVariables } from '@/application/shared/app-context';
import { CassandraShortUrlRepository } from '@/application/repository/short-url-repository';
import { RedisShortUrlCache } from '@/application/services/redis-short-url-cache';
import { RedisAccessStatsRecorder } from '@/application/services/redis-access-stats-recorder';
import { RedirectUrlUseCase } from '@/domain/usecase/redirect-url';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';

const REDIRECT_STATUS_CODE = 302;

const redirectParamsSchema = z.object({
  shortcode: z.string().min(1, 'shortcode is required'),
});

/**
 * Controller de redirecionamento (ver tasks/04-redirect.md).
 * Fino: delega para o usecase e traduz o resultado em um redirect 302.
 * Rota pública, sem middleware de autenticação (ver CODE_STANDARDS.md - performance).
 */
export function createRedirectController(cassandra: CassandraClient, redis: RedisClient) {
  const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

  const shortUrlRepository = new CassandraShortUrlRepository(cassandra);
  const shortUrlCache = new RedisShortUrlCache(redis);
  const accessStatsRecorder = new RedisAccessStatsRecorder(redis);

  app.get('/:shortcode', zValidator('param', redirectParamsSchema), async (c) => {
    const { shortcode } = c.req.valid('param');

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, accessStatsRecorder);
    const { originalUrl } = await usecase.execute({ code: shortcode });

    return c.redirect(originalUrl, REDIRECT_STATUS_CODE);
  });

  return app;
}
