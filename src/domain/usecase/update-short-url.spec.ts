import { describe, expect, it, jest } from '@jest/globals';
import { UpdateShortUrlUseCase } from './update-short-url';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/domain/shared/errors';
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

describe('UpdateShortUrlUseCase', () => {
  it('throws NotFoundError when the short URL does not exist', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(null);

    const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await expect(
      usecase.execute({ shortcode: 'missing', userId: 'user-1' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ForbiddenError when the requester is not the owner', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl({ userId: 'owner-1' }));

    const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await expect(
      usecase.execute({ shortcode: 'aB3x', userId: 'other-user' }),
    ).rejects.toThrow(ForbiddenError);

    expect(shortUrlRepository.update).not.toHaveBeenCalled();
  });

  it('throws ConflictError when the new custom alias is already in use by another link', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    shortUrlRepository.findByCode
      .mockResolvedValueOnce(buildShortUrl())
      .mockResolvedValueOnce(buildShortUrl({ id: 'short-url-2', customAlias: 'taken' }));

    const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await expect(
      usecase.execute({ shortcode: 'aB3x', userId: 'user-1', customAlias: 'taken' }),
    ).rejects.toThrow(ConflictError);

    expect(shortUrlRepository.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when the new expiresAt is in the past', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl());

    const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await expect(
      usecase.execute({
        shortcode: 'aB3x',
        userId: 'user-1',
        expiresAt: '2020-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(ValidationError);

    expect(shortUrlRepository.update).not.toHaveBeenCalled();
  });

  it('updates the custom alias and invalidates the cache for the old and new codes', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    const existing = buildShortUrl({ customAlias: 'old-alias' });

    shortUrlRepository.findByCode
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);
    shortUrlRepository.update.mockResolvedValue(
      buildShortUrl({ customAlias: 'new-alias' }),
    );

    const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);

    const result = await usecase.execute({
      shortcode: 'aB3x',
      userId: 'user-1',
      customAlias: 'new-alias',
    });

    expect(shortUrlRepository.update).toHaveBeenCalledWith({
      id: existing.id,
      shortcode: existing.shortcode,
      originalUrl: existing.originalUrl,
      userId: existing.userId,
      createdAt: existing.createdAt,
      previousCustomAlias: 'old-alias',
      customAlias: 'new-alias',
      expiresAt: null,
    });
    expect(result.customAlias).toBe('new-alias');
    expect(shortUrlCache.delete).toHaveBeenCalledWith('aB3x');
    expect(shortUrlCache.delete).toHaveBeenCalledWith('old-alias');
    expect(shortUrlCache.delete).toHaveBeenCalledWith('new-alias');
  });

  it('removes the custom alias when customAlias is null', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    const existing = buildShortUrl({ customAlias: 'old-alias' });

    shortUrlRepository.findByCode.mockResolvedValue(existing);
    shortUrlRepository.update.mockResolvedValue(buildShortUrl({ customAlias: null }));

    const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);

    await usecase.execute({ shortcode: 'aB3x', userId: 'user-1', customAlias: null });

    expect(shortUrlRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ previousCustomAlias: 'old-alias', customAlias: null }),
    );
    expect(shortUrlCache.delete).toHaveBeenCalledWith('old-alias');
  });

  it('updates only expiresAt when customAlias is not provided', async () => {
    const { shortUrlRepository, shortUrlCache } = buildDeps();

    const existing = buildShortUrl({ customAlias: 'kept-alias' });

    shortUrlRepository.findByCode.mockResolvedValue(existing);
    shortUrlRepository.update.mockResolvedValue(existing);

    const usecase = new UpdateShortUrlUseCase(shortUrlRepository, shortUrlCache);

    const futureDate = new Date(Date.now() + 60_000).toISOString();

    await usecase.execute({ shortcode: 'aB3x', userId: 'user-1', expiresAt: futureDate });

    expect(shortUrlRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        previousCustomAlias: 'kept-alias',
        customAlias: 'kept-alias',
        expiresAt: new Date(futureDate),
      }),
    );
  });
});
