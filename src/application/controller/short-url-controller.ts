import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppBindings, AppVariables } from '@/application/shared/app-context';
import { optionalAuthMiddleware } from '@/application/shared/auth-middleware';
import { CassandraShortUrlRepository } from '@/application/repository/short-url-repository';
import { RedisShortcodeGenerator } from '@/application/services/redis-shortcode-generator';
import { CreateShortUrlUseCase } from '@/domain/usecase/create-short-url';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;

const createShortUrlSchema = z.object({
  originalUrl: z.string().min(1, 'originalUrl is required'),
  customAlias: z
    .string()
    .min(3, 'customAlias must have at least 3 characters')
    .max(32, 'customAlias must have at most 32 characters')
    .regex(ALIAS_PATTERN, 'customAlias must contain only letters, numbers, "_" or "-"')
    .optional(),
  expiresAt: z.string().datetime({ message: 'expiresAt must be an ISO 8601 date' }).optional(),
});

/**
 * Controller de URLs encurtadas.
 * Fino: apenas valida input (zod), delega para o usecase e traduz o resultado em resposta HTTP.
 * Autenticação opcional: se houver token válido, a URL é vinculada ao usuário (ver
 * tasks/03-create-short-url.md).
 */
export function createShortUrlController(cassandra: CassandraClient, redis: RedisClient) {
  const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

  const shortUrlRepository = new CassandraShortUrlRepository(cassandra);
  const shortcodeGenerator = new RedisShortcodeGenerator(redis);

  app.post(
    '/',
    optionalAuthMiddleware(),
    zValidator('json', createShortUrlSchema),
    async (c) => {
      const input = c.req.valid('json');
      const user = c.get('user');

      const usecase = new CreateShortUrlUseCase(shortUrlRepository, shortcodeGenerator);
      const shortUrl = await usecase.execute({
        originalUrl: input.originalUrl,
        customAlias: input.customAlias,
        expiresAt: input.expiresAt,
        userId: user?.id ?? null,
      });

      return c.json(
        {
          id: shortUrl.id,
          originalUrl: shortUrl.originalUrl,
          shortcode: shortUrl.shortcode,
          customAlias: shortUrl.customAlias,
          expiresAt: shortUrl.expiresAt,
          createdAt: shortUrl.createdAt,
        },
        201,
      );
    },
  );

  return app;
}
