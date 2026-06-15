import { describe, expect, it, jest } from '@jest/globals';
import { RedirectUrlUseCase } from './redirect-url';
import { GoneError, NotFoundError } from '@/domain/shared/errors';
import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortUrlCache } from '@/domain/services/short-url-cache';
import type { RegisterAccessUseCase } from '@/domain/usecase/register-access';
import type { ShortUrl } from '@/domain/entities/short-url';

function buildDeps() {
  const shortUrlRepository = {
    findByCode: jest.fn<ShortUrlRepository['findByCode']>(),
    create: jest.fn<ShortUrlRepository['create']>(),
    findManyByUserId: jest.fn<ShortUrlRepository['findManyByUserId']>(),
    update: jest.fn<ShortUrlRepository['update']>(),
    delete: jest.fn<ShortUrlRepository['delete']>(),
  } satisfies ShortUrlRepository;

  const shortUrlCache = {
    get: jest.fn<ShortUrlCache['get']>(),
    set: jest.fn<ShortUrlCache['set']>(),
    delete: jest.fn<ShortUrlCache['delete']>(),
  } satisfies ShortUrlCache;

  const registerAccess = {
    execute: jest.fn<RegisterAccessUseCase['execute']>().mockResolvedValue(undefined),
  } as unknown as RegisterAccessUseCase;

  return { shortUrlRepository, shortUrlCache, registerAccess };
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

const baseInput = { code: 'aB3x', referrer: null, userAgent: null, ip: null };

describe('RedirectUrlUseCase', () => {
  it('returns the original URL on a cache hit without querying Cassandra', async () => {
    const { shortUrlRepository, shortUrlCache, registerAccess } = buildDeps();

    shortUrlCache.get.mockResolvedValue(buildShortUrl());

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, registerAccess);

    const result = await usecase.execute(baseInput);

    expect(result.originalUrl).toBe('https://example.com/some/long/path');
    expect(shortUrlRepository.findByCode).not.toHaveBeenCalled();
    expect(shortUrlCache.set).not.toHaveBeenCalled();
    expect(registerAccess.execute).toHaveBeenCalledWith({
      shortcode: 'aB3x',
      referrer: null,
      userAgent: null,
      ip: null,
    });
  });

  it('falls back to Cassandra on a cache miss and populates the cache', async () => {
    const { shortUrlRepository, shortUrlCache, registerAccess } = buildDeps();

    shortUrlCache.get.mockResolvedValue(null);
    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl());

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, registerAccess);

    const result = await usecase.execute(baseInput);

    expect(result.originalUrl).toBe('https://example.com/some/long/path');
    expect(shortUrlRepository.findByCode).toHaveBeenCalledWith('aB3x');
    expect(shortUrlCache.set).toHaveBeenCalledWith('aB3x', buildShortUrl());
  });

  it('throws NotFoundError when the shortcode does not exist', async () => {
    const { shortUrlRepository, shortUrlCache, registerAccess } = buildDeps();

    shortUrlCache.get.mockResolvedValue(null);
    shortUrlRepository.findByCode.mockResolvedValue(null);

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, registerAccess);

    await expect(usecase.execute({ ...baseInput, code: 'missing' })).rejects.toThrow(
      NotFoundError,
    );

    expect(shortUrlCache.set).not.toHaveBeenCalled();
    expect(registerAccess.execute).not.toHaveBeenCalled();
  });

  it('throws GoneError when the short URL has expired', async () => {
    const { shortUrlRepository, shortUrlCache, registerAccess } = buildDeps();

    shortUrlCache.get.mockResolvedValue(
      buildShortUrl({ expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
    );

    const usecase = new RedirectUrlUseCase(shortUrlRepository, shortUrlCache, registerAccess);

    await expect(usecase.execute(baseInput)).rejects.toThrow(GoneError);

    expect(registerAccess.execute).not.toHaveBeenCalled();
  });
});
