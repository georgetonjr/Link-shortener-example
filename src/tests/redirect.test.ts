import { describe, expect, it, jest } from '@jest/globals';
import { createTestApp } from '@/tests/helpers/create-test-app';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';
import type { ShortUrlRecord } from '@/application/repository/models/short-url';

type ErrorResponseBody = { error: string; message: string; requestId: string };

function buildShortUrlRecord(overrides: Partial<ShortUrlRecord> = {}): ShortUrlRecord {
  return {
    id: 'short-url-1',
    original_url: 'https://example.com/some/long/path',
    shortcode: 'aB3x',
    custom_alias: null,
    user_id: null,
    expires_at: null,
    created_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('GET /:shortcode', () => {
  it('redirects to the original URL on a cache hit', async () => {
    const get = jest
      .fn<RedisClient['get']>()
      .mockResolvedValue(JSON.stringify({
        id: 'short-url-1',
        originalUrl: 'https://example.com/cached',
        shortcode: 'aB3x',
        userId: null,
        customAlias: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      }));
    const execute = jest.fn<CassandraClient['execute']>();

    const { app } = createTestApp({ execute }, { get });

    const response = await app.request('/aB3x', { redirect: 'manual' });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/cached');
    expect(execute).not.toHaveBeenCalled();
  });

  it('redirects to the original URL on a cache miss, querying Cassandra and populating the cache', async () => {
    const get = jest.fn<RedisClient['get']>().mockResolvedValue(null);
    const set = jest.fn<RedisClient['set']>().mockResolvedValue(undefined);
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValue([buildShortUrlRecord()]);

    const { app } = createTestApp({ execute }, { get, set });

    const response = await app.request('/aB3x', { redirect: 'manual' });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/some/long/path');
    expect(set).toHaveBeenCalledWith('shorturl:cache:aB3x', expect.any(String), expect.any(Number));
  });

  it('returns 404 when the shortcode does not exist', async () => {
    const get = jest.fn<RedisClient['get']>().mockResolvedValue(null);
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValue([]);

    const { app } = createTestApp({ execute }, { get });

    const response = await app.request('/missing', { redirect: 'manual' });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 410 when the short URL has expired', async () => {
    const get = jest
      .fn<RedisClient['get']>()
      .mockResolvedValue(JSON.stringify({
        id: 'short-url-1',
        originalUrl: 'https://example.com/expired',
        shortcode: 'expd',
        userId: null,
        customAlias: null,
        expiresAt: '2020-01-01T00:00:00.000Z',
        createdAt: '2020-01-01T00:00:00.000Z',
      }));
    const execute = jest.fn<CassandraClient['execute']>();

    const { app } = createTestApp({ execute }, { get });

    const response = await app.request('/expd', { redirect: 'manual' });

    expect(response.status).toBe(410);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('GONE');
  });

  it('increments the access counter on a successful redirect', async () => {
    const get = jest.fn<RedisClient['get']>().mockResolvedValue(null);
    const set = jest.fn<RedisClient['set']>().mockResolvedValue(undefined);
    const incr = jest.fn<RedisClient['incr']>().mockResolvedValue(1);
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValue([buildShortUrlRecord()]);

    const { app } = createTestApp({ execute }, { get, set, incr });

    await app.request('/aB3x', { redirect: 'manual' });

    expect(incr).toHaveBeenCalledWith('shorturl:access:aB3x');
  });
});
