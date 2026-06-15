import { describe, expect, it, jest } from '@jest/globals';
import { ListUserUrlsUseCase } from './list-user-urls';
import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortUrl } from '@/domain/entities/short-url';

function buildDeps() {
  const shortUrlRepository = {
    findByCode: jest.fn<ShortUrlRepository['findByCode']>(),
    create: jest.fn<ShortUrlRepository['create']>(),
    findManyByUserId: jest.fn<ShortUrlRepository['findManyByUserId']>(),
    update: jest.fn<ShortUrlRepository['update']>(),
    delete: jest.fn<ShortUrlRepository['delete']>(),
  } satisfies ShortUrlRepository;

  return { shortUrlRepository };
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

describe('ListUserUrlsUseCase', () => {
  it('lists the user URLs using the default limit', async () => {
    const { shortUrlRepository } = buildDeps();

    shortUrlRepository.findManyByUserId.mockResolvedValue({
      items: [buildShortUrl()],
      nextCursor: null,
    });

    const usecase = new ListUserUrlsUseCase(shortUrlRepository);

    const result = await usecase.execute({ userId: 'user-1' });

    expect(shortUrlRepository.findManyByUserId).toHaveBeenCalledWith('user-1', 20, null);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it('forwards a custom limit and cursor', async () => {
    const { shortUrlRepository } = buildDeps();

    shortUrlRepository.findManyByUserId.mockResolvedValue({ items: [], nextCursor: null });

    const usecase = new ListUserUrlsUseCase(shortUrlRepository);

    await usecase.execute({ userId: 'user-1', limit: 5, cursor: '2026-01-01T00:00:00.000Z' });

    expect(shortUrlRepository.findManyByUserId).toHaveBeenCalledWith(
      'user-1',
      5,
      '2026-01-01T00:00:00.000Z',
    );
  });
});
