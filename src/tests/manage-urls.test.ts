import { describe, expect, it, jest } from '@jest/globals';
import { createTestApp } from '@/tests/helpers/create-test-app';
import { JwtTokenService } from '@/application/services/jwt-token-service';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';
import type { ShortUrlRecord } from '@/application/repository/models/short-url';

type ErrorResponseBody = { error: string; message: string; requestId: string };

type ShortUrlResponseBody = {
  id: string;
  originalUrl: string;
  shortcode: string;
  customAlias: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type ListUrlsResponseBody = {
  items: ShortUrlResponseBody[];
  nextCursor: string | null;
};

const tokenService = new JwtTokenService();

function authHeader(userId: string): { authorization: string } {
  return { authorization: `Bearer ${tokenService.sign({ sub: userId, email: 'user@example.com' })}` };
}

function buildShortUrlRecord(overrides: Partial<ShortUrlRecord> = {}): ShortUrlRecord {
  return {
    id: 'short-url-1',
    original_url: 'https://example.com/some/long/path',
    shortcode: 'aB3x',
    custom_alias: null,
    user_id: 'user-1',
    expires_at: null,
    created_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('GET /urls', () => {
  it('returns 401 without an Authorization header', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls');

    expect(response.status).toBe(401);
  });

  it('returns the URLs of the authenticated user', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValueOnce([buildShortUrlRecord(), buildShortUrlRecord({ id: 'short-url-2', shortcode: 'cD4y' })]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls', { headers: authHeader('user-1') });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ListUrlsResponseBody;
    expect(body.items).toHaveLength(2);
    expect(body.items[0]?.shortcode).toBe('aB3x');
    expect(body.nextCursor).toBeNull();
    expect(execute).toHaveBeenCalledWith(expect.stringContaining('short_urls_by_user'), [
      'user-1',
      20,
    ]);
  });

  it('returns 400 when cursor is not a valid ISO date', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls?cursor=not-a-date', {
      headers: authHeader('user-1'),
    });

    expect(response.status).toBe(400);
  });
});

describe('PATCH /urls/:shortcode', () => {
  it('returns 401 without an Authorization header', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls/aB3x', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customAlias: 'new-alias' }),
    });

    expect(response.status).toBe(401);
  });

  it('returns 404 when the short URL does not exist', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValueOnce([]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls/missing', {
      method: 'PATCH',
      headers: { ...authHeader('user-1'), 'content-type': 'application/json' },
      body: JSON.stringify({ customAlias: 'new-alias' }),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 403 when the requester is not the owner of the link', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValueOnce([buildShortUrlRecord({ user_id: 'owner-1' })]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls/aB3x', {
      method: 'PATCH',
      headers: { ...authHeader('other-user'), 'content-type': 'application/json' },
      body: JSON.stringify({ customAlias: 'new-alias' }),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('FORBIDDEN');
  });

  it('returns 409 when the new custom alias is already in use', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValueOnce([buildShortUrlRecord()])
      .mockResolvedValueOnce([buildShortUrlRecord({ id: 'short-url-2', custom_alias: 'taken' })]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls/aB3x', {
      method: 'PATCH',
      headers: { ...authHeader('user-1'), 'content-type': 'application/json' },
      body: JSON.stringify({ customAlias: 'taken' }),
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('CONFLICT');
  });

  it('returns 400 for an invalid customAlias format', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls/aB3x', {
      method: 'PATCH',
      headers: { ...authHeader('user-1'), 'content-type': 'application/json' },
      body: JSON.stringify({ customAlias: 'invalid alias!' }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 when the body has neither customAlias nor expiresAt', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls/aB3x', {
      method: 'PATCH',
      headers: { ...authHeader('user-1'), 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });

  it('updates the custom alias, persists the change and invalidates the cache', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValueOnce([buildShortUrlRecord()])
      .mockResolvedValueOnce([]);
    const executeBatch = jest.fn<CassandraClient['executeBatch']>().mockResolvedValue(undefined);
    const del = jest.fn<RedisClient['del']>().mockResolvedValue(undefined);

    const { app } = createTestApp({ execute, executeBatch }, { del });

    const response = await app.request('/urls/aB3x', {
      method: 'PATCH',
      headers: { ...authHeader('user-1'), 'content-type': 'application/json' },
      body: JSON.stringify({ customAlias: 'new-alias' }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ShortUrlResponseBody;
    expect(body.customAlias).toBe('new-alias');
    expect(executeBatch).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith('shorturl:cache:aB3x');
    expect(del).toHaveBeenCalledWith('shorturl:cache:new-alias');
  });
});

describe('DELETE /urls/:shortcode', () => {
  it('returns 401 without an Authorization header', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls/aB3x', { method: 'DELETE' });

    expect(response.status).toBe(401);
  });

  it('returns 404 when the short URL does not exist', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValueOnce([]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls/missing', {
      method: 'DELETE',
      headers: authHeader('user-1'),
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 403 when the requester is not the owner of the link', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValueOnce([buildShortUrlRecord({ user_id: 'owner-1' })]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls/aB3x', {
      method: 'DELETE',
      headers: authHeader('other-user'),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('FORBIDDEN');
  });

  it('deletes the short URL and invalidates the cache', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValueOnce([buildShortUrlRecord({ custom_alias: 'my-alias' })]);
    const executeBatch = jest.fn<CassandraClient['executeBatch']>().mockResolvedValue(undefined);
    const del = jest.fn<RedisClient['del']>().mockResolvedValue(undefined);

    const { app } = createTestApp({ execute, executeBatch }, { del });

    const response = await app.request('/urls/aB3x', {
      method: 'DELETE',
      headers: authHeader('user-1'),
    });

    expect(response.status).toBe(204);
    expect(executeBatch).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith('shorturl:cache:aB3x');
    expect(del).toHaveBeenCalledWith('shorturl:cache:my-alias');
  });
});
