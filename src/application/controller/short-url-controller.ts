import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from '@/application/shared/zod-openapi';
import type { AppBindings, AppVariables } from '@/application/shared/app-context';
import { authMiddleware, optionalAuthMiddleware } from '@/application/shared/auth-middleware';
import { CassandraShortUrlRepository } from '@/application/repository/short-url-repository';
import { CassandraAccessLogRepository } from '@/application/repository/access-log-repository';
import { RedisShortcodeGenerator } from '@/application/services/redis-shortcode-generator';
import { RedisAccessStatsRecorder } from '@/application/services/redis-access-stats-recorder';
import { RedisShortUrlCache } from '@/application/services/redis-short-url-cache';
import { CreateShortUrlUseCase } from '@/domain/usecase/create-short-url';
import { GetUrlStatsUseCase } from '@/domain/usecase/get-url-stats';
import { ListUserUrlsUseCase } from '@/domain/usecase/list-user-urls';
import { UpdateShortUrlUseCase } from '@/domain/usecase/update-short-url';
import { DeleteShortUrlUseCase } from '@/domain/usecase/delete-short-url';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_RECENT_ACCESSES_LIMIT = 100;
const MAX_LIST_URLS_LIMIT = 100;
const NO_CONTENT_STATUS = 204;

export const createShortUrlSchema = z.object({
  originalUrl: z
    .string()
    .min(1, 'originalUrl is required')
    .openapi({ example: 'https://example.com/some/long/path' }),
  customAlias: z
    .string()
    .min(3, 'customAlias must have at least 3 characters')
    .max(32, 'customAlias must have at most 32 characters')
    .regex(ALIAS_PATTERN, 'customAlias must contain only letters, numbers, "_" or "-"')
    .optional()
    .openapi({ example: 'my-alias' }),
  expiresAt: z
    .string()
    .datetime({ message: 'expiresAt must be an ISO 8601 date' })
    .optional()
    .openapi({ example: '2026-12-31T23:59:59.000Z' }),
});

export const shortcodeParamsSchema = z.object({
  shortcode: z.string().min(1, 'shortcode is required').openapi({ example: 'aB3x' }),
});

export const statsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_RECENT_ACCESSES_LIMIT).optional(),
  cursor: z.string().datetime({ message: 'cursor must be an ISO 8601 date' }).optional(),
});

export const listUserUrlsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIST_URLS_LIMIT).optional(),
  cursor: z.string().datetime({ message: 'cursor must be an ISO 8601 date' }).optional(),
});

export const updateShortUrlSchema = z
  .object({
    customAlias: z
      .string()
      .min(3, 'customAlias must have at least 3 characters')
      .max(32, 'customAlias must have at most 32 characters')
      .regex(ALIAS_PATTERN, 'customAlias must contain only letters, numbers, "_" or "-"')
      .nullable()
      .optional()
      .openapi({ example: 'my-new-alias' }),
    expiresAt: z
      .string()
      .datetime({ message: 'expiresAt must be an ISO 8601 date' })
      .nullable()
      .optional()
      .openapi({ example: '2026-12-31T23:59:59.000Z' }),
  })
  .refine((data) => data.customAlias !== undefined || data.expiresAt !== undefined, {
    message: 'At least one of customAlias or expiresAt must be provided',
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
  const accessStatsRecorder = new RedisAccessStatsRecorder(redis);
  const accessLogRepository = new CassandraAccessLogRepository(cassandra);
  const shortUrlCache = new RedisShortUrlCache(redis);

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

  app.get('/', authMiddleware(), zValidator('query', listUserUrlsQuerySchema), async (c) => {
    const { limit, cursor } = c.req.valid('query');
    const user = c.get('user');

    const usecase = new ListUserUrlsUseCase(shortUrlRepository);
    const page = await usecase.execute({ userId: user!.id, limit, cursor });

    return c.json({
      items: page.items.map((item) => ({
        id: item.id,
        originalUrl: item.originalUrl,
        shortcode: item.shortcode,
        customAlias: item.customAlias,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
      })),
      nextCursor: page.nextCursor,
    });
  });

  app.patch(
    '/:shortcode',
    authMiddleware(),
    zValidator('param', shortcodeParamsSchema),
    zValidator('json', updateShortUrlSchema),
    async (c) => {
      const { shortcode } = c.req.valid('param');
      const input = c.req.valid('json');
      const user = c.get('user');

      const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);
      const shortUrl = await usecase.execute({
        shortcode,
        userId: user!.id,
        customAlias: input.customAlias,
        expiresAt: input.expiresAt,
      });

      return c.json({
        id: shortUrl.id,
        originalUrl: shortUrl.originalUrl,
        shortcode: shortUrl.shortcode,
        customAlias: shortUrl.customAlias,
        expiresAt: shortUrl.expiresAt,
        createdAt: shortUrl.createdAt,
      });
    },
  );

  app.delete(
    '/:shortcode',
    authMiddleware(),
    zValidator('param', shortcodeParamsSchema),
    async (c) => {
      const { shortcode } = c.req.valid('param');
      const user = c.get('user');

      const usecase = new DeleteShortUrlUseCase(shortUrlRepository, shortUrlCache);
      await usecase.execute({ shortcode, userId: user!.id });

      return c.body(null, NO_CONTENT_STATUS);
    },
  );

  app.get(
    '/:shortcode/stats',
    authMiddleware(),
    zValidator('param', shortcodeParamsSchema),
    zValidator('query', statsQuerySchema),
    async (c) => {
      const { shortcode } = c.req.valid('param');
      const { limit, cursor } = c.req.valid('query');
      const user = c.get('user');

      const usecase = new GetUrlStatsUseCase(
        shortUrlRepository,
        accessStatsRecorder,
        accessLogRepository,
      );
      const stats = await usecase.execute({
        shortcode,
        userId: user!.id,
        recentLimit: limit,
        recentCursor: cursor,
      });

      return c.json({
        shortcode: stats.shortcode,
        totalClicks: stats.totalClicks,
        clicksByDay: stats.clicksByDay,
        recentAccesses: {
          items: stats.recentAccesses.items.map((item) => ({
            accessedAt: item.accessedAt,
            referrer: item.referrer,
            userAgent: item.userAgent,
            ip: item.ip,
          })),
          nextCursor: stats.recentAccesses.nextCursor,
        },
      });
    },
  );

  return app;
}
