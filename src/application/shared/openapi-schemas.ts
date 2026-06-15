import { z } from '@/application/shared/zod-openapi';

/**
 * Schemas de resposta usados pela documentação OpenAPI (ver tasks/07-api-docs.md).
 *
 * Os schemas de request (body/params/query) são os mesmos usados pelo
 * `zValidator` nos controllers (decision da tarefa 07, evita duplicação);
 * apenas os shapes de resposta - que não passam por validação - precisam
 * de um schema dedicado para a documentação.
 */

export const errorResponseSchema = z.object({
  error: z.string().openapi({ example: 'NOT_FOUND' }),
  message: z.string().openapi({ example: 'Short URL not found' }),
  requestId: z.string().openapi({ example: '5f0a1c2e-1234-4abc-9def-000000000000' }),
});

export const userResponseSchema = z.object({
  id: z.string().openapi({ example: 'user-1' }),
  email: z.string().email().openapi({ example: 'user@example.com' }),
  createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
});

export const authTokenResponseSchema = z.object({
  token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
});

export const shortUrlResponseSchema = z.object({
  id: z.string().openapi({ example: 'short-url-1' }),
  originalUrl: z.string().openapi({ example: 'https://example.com/some/long/path' }),
  shortcode: z.string().openapi({ example: 'aB3x' }),
  customAlias: z.string().nullable().openapi({ example: 'my-alias' }),
  expiresAt: z.string().datetime().nullable().openapi({ example: '2026-12-31T23:59:59.000Z' }),
  createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
});

export const listUrlsResponseSchema = z.object({
  items: z.array(shortUrlResponseSchema),
  nextCursor: z.string().datetime().nullable().openapi({ example: null }),
});

export const accessLogResponseSchema = z.object({
  accessedAt: z.string().datetime().openapi({ example: '2026-06-14T10:00:00.000Z' }),
  referrer: z.string().nullable().openapi({ example: 'https://google.com' }),
  userAgent: z.string().nullable().openapi({ example: 'Mozilla/5.0' }),
  ip: z.string().nullable().openapi({ example: '127.0.0.1' }),
});

export const clicksByDaySchema = z.object({
  day: z.string().openapi({ example: '2026-06-14' }),
  clicks: z.number().int().openapi({ example: 42 }),
});

export const statsResponseSchema = z.object({
  shortcode: z.string().openapi({ example: 'aB3x' }),
  totalClicks: z.number().int().openapi({ example: 42 }),
  clicksByDay: z.array(clicksByDaySchema),
  recentAccesses: z.object({
    items: z.array(accessLogResponseSchema),
    nextCursor: z.string().datetime().nullable().openapi({ example: null }),
  }),
});
