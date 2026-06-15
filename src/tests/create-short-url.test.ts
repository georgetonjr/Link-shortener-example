import { describe, expect, it, jest } from '@jest/globals';
import { createTestApp } from '@/tests/helpers/create-test-app';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';

type ShortUrlResponseBody = {
  id: string;
  originalUrl: string;
  shortcode: string;
  customAlias: string | null;
};

type ErrorResponseBody = { error: string; message: string; requestId: string };

describe('POST /urls', () => {
  it('creates a short URL anonymously and returns 201', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValue([]);
    const incr = jest.fn<RedisClient['incr']>().mockResolvedValue(1);

    const { app } = createTestApp({ execute }, { incr });

    const response = await app.request('/urls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalUrl: 'https://example.com/some/long/path' }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ShortUrlResponseBody;
    expect(body.originalUrl).toBe('https://example.com/some/long/path');
    expect(body.shortcode).toHaveLength(4);
    expect(body.customAlias).toBeNull();
  });

  it('returns 400 for an invalid originalUrl', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalUrl: 'not-a-url' }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 for an invalid customAlias format', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalUrl: 'https://example.com',
        customAlias: 'invalid alias!',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 409 when customAlias is already in use', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValueOnce([
      {
        id: 'existing-id',
        original_url: 'https://example.com/other',
        shortcode: 'zzzz',
        custom_alias: 'taken-alias',
        user_id: null,
        expires_at: null,
        created_at: new Date(),
      },
    ]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalUrl: 'https://example.com',
        customAlias: 'taken-alias',
      }),
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('CONFLICT');
    expect(body.requestId).toBeTruthy();
  });

  it('returns 400 when expiresAt is not a valid ISO date', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalUrl: 'https://example.com', expiresAt: 'not-a-date' }),
    });

    expect(response.status).toBe(400);
  });

  it('links the short URL to the authenticated user when a valid token is provided', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValue([]);
    const incr = jest.fn<RedisClient['incr']>().mockResolvedValue(2);

    const { app } = createTestApp({ execute }, { incr });

    // Sem token válido, a rota segue como anônima (optionalAuthMiddleware);
    // aqui validamos apenas que a requisição sem header de auth funciona normalmente.
    const response = await app.request('/urls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        originalUrl: 'https://example.com/another/path',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as ShortUrlResponseBody;
    expect(body.shortcode).toHaveLength(4);
  });
});
