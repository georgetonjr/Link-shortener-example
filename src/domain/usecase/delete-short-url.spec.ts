import { describe, expect, it, jest } from '@jest/globals';
import { DeleteShortUrlUseCase } from './delete-short-url';
import { ForbiddenError, NotFoundError } from '@/domain/shared/errors';
import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortUrlCache } from '@/domain/services/short-url-cache';
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

  return { shortUrlRepository, shortUrlCache };
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

describe('DeleteShortUrlUseCase', () => {
  it('throws NotFoundError when the short URL does not exist', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(null);

    const usecase = new DeleteShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await expect(
      usecase.execute({ shortcode: 'missing', userId: 'user-1' }),
    ).rejects.toThrow(NotFoundError);

    expect(shortUrlRepository.delete).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when the requester is not the owner', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl({ userId: 'owner-1' }));

    const usecase = new DeleteShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await expect(
      usecase.execute({ shortcode: 'aB3x', userId: 'other-user' }),
    ).rejects.toThrow(ForbiddenError);

    expect(shortUrlRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes the short URL and invalidates the cache for the shortcode and custom alias', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    const existing = buildShortUrl({ customAlias: 'my-alias' });

    shortUrlRepository.findByCode.mockResolvedValue(existing);
    shortUrlRepository.delete.mockResolvedValue(undefined);

    const usecase = new DeleteShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await usecase.execute({ shortcode: 'aB3x', userId: 'user-1' });

    expect(shortUrlRepository.delete).toHaveBeenCalledWith(existing);
    expect(shortUrlCache.delete).toHaveBeenCalledWith('aB3x');
    expect(shortUrlCache.delete).toHaveBeenCalledWith('my-alias');
  });
});
