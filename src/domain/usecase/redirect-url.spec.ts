import { describe, expect, it, jest } from '@jest/globals';
import { RedirectUrlUseCase } from './redirect-url';
import { GoneError, NotFoundError } from '@/domain/shared/errors';
import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortUrlCache } from '@/domain/services/short-url-cache';
import type { AccessStatsRecorder } from '@/domain/services/access-stats-recorder';
import type { ShortUrl } from '@/domain/entities/short-url';

function buildDeps() {
  const shortUrlRepository = {
    findByCode: jest.fn<ShortUrlRepository['findByCode']>(),
    create: jest.fn<ShortUrlRepository['create']>(),
  } satisfies ShortUrlRepository;

  const shortUrlCache = {
    get: jest.fn<ShortUrlCache['get']>(),
    set: jest.fn<ShortUrlCache['set']>(),
  } satisfies ShortUrlCache;

  const accessStatsRecorder = {
    recordAccess: jest.fn<AccessStatsRecorder['recordAccess']>(),
  } satisfies AccessStatsRecorder;

  return { shortUrlRepository, shortUrlCache, accessStatsRecorder };
}

function buildShortUrl(overrides: Partial<ShortUrl> = {}): ShortUrl {
  return {
    id: 'short-url-1',
    originalUrl: 'https://example.com/some/long/path',
    shortcode: 'aB3x',
    userId: null,
    customAlias: null,
    expiresAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('RedirectUrlUseCase', () => {
  it('returns the original URL on a cache hit without querying Cassandra', async () => {
    const { shortUrlRepository, shortUrlCache, accessStatsRecorder } = buildDeps();

    shortUrlCache.get.mockResolvedValue(buildShortUrl());
    accessStatsRecorder.recordAccess.mockResolvedValue(undefined);

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, accessStatsRecorder);

    const result = await usecase.execute({ code: 'aB3x' });

    expect(result.originalUrl).toBe('https://example.com/some/long/path');
    expect(shortUrlRepository.findByCode).not.toHaveBeenCalled();
    expect(shortUrlCache.set).not.toHaveBeenCalled();
    expect(accessStatsRecorder.recordAccess).toHaveBeenCalledWith('aB3x');
  });

  it('falls back to Cassandra on a cache miss and populates the cache', async () => {
    const { shortUrlRepository, shortUrlCache, accessStatsRecorder } = buildDeps();

    shortUrlCache.get.mockResolvedValue(null);
    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl());
    accessStatsRecorder.recordAccess.mockResolvedValue(undefined);

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, accessStatsRecorder);

    const result = await usecase.execute({ code: 'aB3x' });

    expect(result.originalUrl).toBe('https://example.com/some/long/path');
    expect(shortUrlRepository.findByCode).toHaveBeenCalledWith('aB3x');
    expect(shortUrlCache.set).toHaveBeenCalledWith('aB3x', buildShortUrl());
  });

  it('throws NotFoundError when the shortcode does not exist', async () => {
    const { shortUrlRepository, shortUrlCache, accessStatsRecorder } = buildDeps();

    shortUrlCache.get.mockResolvedValue(null);
    shortUrlRepository.findByCode.mockResolvedValue(null);

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, accessStatsRecorder);

    await expect(usecase.execute({ code: 'missing' })).rejects.toThrow(NotFoundError);

    expect(shortUrlCache.set).not.toHaveBeenCalled();
    expect(accessStatsRecorder.recordAccess).not.toHaveBeenCalled();
  });

  it('throws GoneError when the short URL has expired', async () => {
    const { shortUrlRepository, shortUrlCache, accessStatsRecorder } = buildDeps();

    shortUrlCache.get.mockResolvedValue(
      buildShortUrl({ expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
    );

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, accessStatsRecorder);

    await expect(usecase.execute({ code: 'aB3x' })).rejects.toThrow(GoneError);

    expect(accessStatsRecorder.recordAccess).not.toHaveBeenCalled();
  });
});
