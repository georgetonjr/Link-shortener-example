import { describe, expect, it, jest } from '@jest/globals';
import { createTestApp } from '@/tests/helpers/create-test-app';
import { JwtTokenService } from '@/application/services/jwt-token-service';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';
import type { ShortUrlRecord } from '@/application/repository/models/short-url';
import type { AccessLogRecord } from '@/application/repository/models/access-log';

type ErrorResponseBody = { error: string; message: string; requestId: string };

type StatsResponseBody = {
  shortcode: string;
  totalClicks: number;
  clicksByDay: { day: string; clicks: number }[];
  recentAccesses: {
    items: { accessedAt: string; referrer: string | null; userAgent: string | null; ip: string | null }[];
    nextCursor: string | null;
  };
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

function buildAccessLogRecord(overrides: Partial<AccessLogRecord> = {}): AccessLogRecord {
  return {
    shortcode: 'aB3x',
    accessed_at: new Date('2026-06-14T10:00:00.000Z'),
    id: 'access-log-1',
    referrer: 'https://google.com',
    user_agent: 'jest-test',
    ip: '127.0.0.1',
    ...overrides,
  };
}

describe('GET /urls/:shortcode/stats', () => {
  it('returns 401 without an Authorization header', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls/aB3x/stats');

    expect(response.status).toBe(401);
  });

  it('returns 404 when the short URL does not exist', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValueOnce([]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/urls/missing/stats', {
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

    const response = await app.request('/urls/aB3x/stats', {
      headers: authHeader('other-user'),
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('FORBIDDEN');
  });

  it('returns total clicks, clicks by day and recent accesses for the owner', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      .mockResolvedValueOnce([buildShortUrlRecord({ user_id: 'user-1' })])
      .mockResolvedValueOnce([
        { accessed_at: new Date('2026-06-14T10:00:00.000Z') },
        { accessed_at: new Date('2026-06-13T10:00:00.000Z') },
      ])
      .mockResolvedValueOnce([buildAccessLogRecord()]);
    const get = jest.fn<RedisClient['get']>().mockResolvedValue('42');

    const { app } = createTestApp({ execute }, { get });

    const response = await app.request('/urls/aB3x/stats', {
      headers: authHeader('user-1'),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as StatsResponseBody;
    expect(body.shortcode).toBe('aB3x');
    expect(body.totalClicks).toBe(42);
    expect(body.clicksByDay).toEqual([
      { day: '2026-06-14', clicks: 1 },
      { day: '2026-06-13', clicks: 1 },
    ]);
    expect(body.recentAccesses.items).toHaveLength(1);
    expect(body.recentAccesses.items[0]?.referrer).toBe('https://google.com');
    expect(body.recentAccesses.nextCursor).toBeNull();
    expect(get).toHaveBeenCalledWith('shorturl:access:aB3x');
  });

  it('returns 400 when cursor is not a valid ISO date', async () => {
    const { app } = createTestApp();

    const response = await app.request('/urls/aB3x/stats?cursor=not-a-date', {
      headers: authHeader('user-1'),
    });

    expect(response.status).toBe(400);
  });
});
