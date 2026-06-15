import { describe, expect, it, jest } from '@jest/globals';
import { GetUrlStatsUseCase } from './get-url-stats';
import { ForbiddenError, NotFoundError } from '@/domain/shared/errors';
import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { AccessStatsRecorder } from '@/domain/services/access-stats-recorder';
import type { AccessLogRepository } from '@/domain/repository/access-log-repository';
import type { ShortUrl } from '@/domain/entities/short-url';

function buildDeps() {
  const shortUrlRepository = {
    findByCode: jest.fn<ShortUrlRepository['findByCode']>(),
    create: jest.fn<ShortUrlRepository['create']>(),
  } satisfies ShortUrlRepository;

  const accessStatsRecorder = {
    recordAccess: jest.fn<AccessStatsRecorder['recordAccess']>(),
    getAccessCount: jest.fn<AccessStatsRecorder['getAccessCount']>(),
  } satisfies AccessStatsRecorder;

  const accessLogRepository = {
    create: jest.fn<AccessLogRepository['create']>(),
    countByShortcodeGroupedByDay: jest.fn<AccessLogRepository['countByShortcodeGroupedByDay']>(),
    findRecentByShortcode: jest.fn<AccessLogRepository['findRecentByShortcode']>(),
  } satisfies AccessLogRepository;

  return { shortUrlRepository, accessStatsRecorder, accessLogRepository };
}

function buildShortUrl(overrides: Partial<ShortUrl> = {}): ShortUrl {
  return {
    id: 'short-url-1',
    originalUrl: 'https://example.com/some/long/path',
    shortcode: 'aB3x',
    userId: 'user-1',
    customAlias: null,
    expiresAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('GetUrlStatsUseCase', () => {
  it('throws NotFoundError when the short URL does not exist', async () => {
    const { shortUrlRepository, accessStatsRecorder, accessLogRepository } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(null);

    const usecase = new GetUrlStatsUseCase(
      shortUrlRepository,
      accessStatsRecorder,
      accessLogRepository,
    );

    await expect(usecase.execute({ shortcode: 'missing', userId: 'user-1' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('throws ForbiddenError when the requester is not the owner', async () => {
    const { shortUrlRepository, accessStatsRecorder, accessLogRepository } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl({ userId: 'owner-1' }));

    const usecase = new GetUrlStatsUseCase(
      shortUrlRepository,
      accessStatsRecorder,
      accessLogRepository,
    );

    await expect(usecase.execute({ shortcode: 'aB3x', userId: 'other-user' })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('returns total clicks, clicks by day and recent accesses for the owner', async () => {
    const { shortUrlRepository, accessStatsRecorder, accessLogRepository } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl({ userId: 'user-1' }));
    accessStatsRecorder.getAccessCount.mockResolvedValue(42);
    accessLogRepository.countByShortcodeGroupedByDay.mockResolvedValue([
      { day: '2026-01-02', clicks: 30 },
      { day: '2026-01-01', clicks: 12 },
    ]);
    accessLogRepository.findRecentByShortcode.mockResolvedValue({
      items: [
        {
          shortcode: 'aB3x',
          accessedAt: new Date('2026-01-02T10:00:00.000Z'),
          referrer: null,
          userAgent: 'jest-test',
          ip: '127.0.0.1',
        },
      ],
      nextCursor: null,
    });

    const usecase = new GetUrlStatsUseCase(
      shortUrlRepository,
      accessStatsRecorder,
      accessLogRepository,
    );

    const result = await usecase.execute({ shortcode: 'aB3x', userId: 'user-1' });

    expect(result.totalClicks).toBe(42);
    expect(result.clicksByDay).toEqual([
      { day: '2026-01-02', clicks: 30 },
      { day: '2026-01-01', clicks: 12 },
    ]);
    expect(result.recentAccesses.items).toHaveLength(1);
    expect(accessStatsRecorder.getAccessCount).toHaveBeenCalledWith('aB3x');
    expect(accessLogRepository.findRecentByShortcode).toHaveBeenCalledWith('aB3x', 20, null);
  });

  it('forwards recentLimit and recentCursor to the access log repository', async () => {
    const { shortUrlRepository, accessStatsRecorder, accessLogRepository } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl({ userId: 'user-1' }));
    accessStatsRecorder.getAccessCount.mockResolvedValue(0);
    accessLogRepository.countByShortcodeGroupedByDay.mockResolvedValue([]);
    accessLogRepository.findRecentByShortcode.mockResolvedValue({ items: [], nextCursor: null });

    const usecase = new GetUrlStatsUseCase(
      shortUrlRepository,
      accessStatsRecorder,
      accessLogRepository,
    );

    await usecase.execute({
      shortcode: 'aB3x',
      userId: 'user-1',
      recentLimit: 5,
      recentCursor: '2026-01-02T10:00:00.000Z',
    });

    expect(accessLogRepository.findRecentByShortcode).toHaveBeenCalledWith(
      'aB3x',
      5,
      '2026-01-02T10:00:00.000Z',
    );
  });
});
