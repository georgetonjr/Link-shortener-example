import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from '@/application/shared/zod-openapi';
import type { AppBindings, AppVariables } from '@/application/shared/app-context';
import { CassandraShortUrlRepository } from '@/application/repository/short-url-repository';
import { CassandraAccessLogRepository } from '@/application/repository/access-log-repository';
import { RedisShortUrlCache } from '@/application/services/redis-short-url-cache';
import { RedisAccessStatsRecorder } from '@/application/services/redis-access-stats-recorder';
import { RedirectUrlUseCase } from '@/domain/usecase/redirect-url';
import { RegisterAccessUseCase } from '@/domain/usecase/register-access';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';

const REDIRECT_STATUS_CODE = 302;

export const redirectParamsSchema = z.object({
  shortcode: z.string().min(1, 'shortcode is required').openapi({ example: 'aB3x' }),
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
  const accessLogRepository = new CassandraAccessLogRepository(cassandra);
  const registerAccess = new RegisterAccessUseCase(accessStatsRecorder, accessLogRepository);

  app.get('/:shortcode', zValidator('param', redirectParamsSchema), async (c) => {
    const { shortcode } = c.req.valid('param');

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, registerAccess);
    const { originalUrl } = await usecase.execute({
      code: shortcode,
      referrer: c.req.header('referer') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
      ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });

    return c.redirect(originalUrl, REDIRECT_STATUS_CODE);
  });

  return app;
}
