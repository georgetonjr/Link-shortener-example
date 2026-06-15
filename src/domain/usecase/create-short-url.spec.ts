import { describe, expect, it, jest } from '@jest/globals';
import { CreateShortUrlUseCase } from './create-short-url';
import { ConflictError, ValidationError } from '@/domain/shared/errors';
import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortcodeGenerator } from '@/domain/services/shortcode-generator';
import type { ShortUrl } from '@/domain/entities/short-url';

function buildDeps() {
  const shortUrlRepository = {
    findByCode: jest.fn<ShortUrlRepository['findByCode']>(),
    create: jest.fn<ShortUrlRepository['create']>(),
  } satisfies ShortUrlRepository;

  const shortcodeGenerator = {
    generate: jest.fn<ShortcodeGenerator['generate']>(),
  } satisfies ShortcodeGenerator;

  return { shortUrlRepository, shortcodeGenerator };
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

describe('CreateShortUrlUseCase', () => {
  it('creates a short URL with a generated shortcode', async () => {
    const { shortUrlRepository, shortcodeGenerator } = buildDeps();

    shortcodeGenerator.generate.mockResolvedValue('aB3x');
    shortUrlRepository.findByCode.mockResolvedValue(null);
    shortUrlRepository.create.mockResolvedValue(buildShortUrl());

    const usecase = new CreateShortUrlUseCase(shortUrlRepository, shortcodeGenerator);

    const result = await usecase.execute({
      originalUrl: 'https://example.com/some/long/path',
      userId: null,
    });

    expect(shortUrlRepository.create).toHaveBeenCalledWith({
      originalUrl: 'https://example.com/some/long/path',
      shortcode: 'aB3x',
      userId: null,
      customAlias: null,
      expiresAt: null,
    });
    expect(result.shortcode).toBe('aB3x');
  });

  it('throws ValidationError for an invalid originalUrl', async () => {
    const { shortUrlRepository, shortcodeGenerator } = buildDeps();

    const usecase = new CreateShortUrlUseCase(shortUrlRepository, shortcodeGenerator);

    await expect(
      usecase.execute({ originalUrl: 'not-a-url', userId: null }),
    ).rejects.toThrow(ValidationError);

    expect(shortUrlRepository.create).not.toHaveBeenCalled();
  });

  it('throws ValidationError when expiresAt is in the past', async () => {
    const { shortUrlRepository, shortcodeGenerator } = buildDeps();

    const usecase = new CreateShortUrlUseCase(shortUrlRepository, shortcodeGenerator);

    await expect(
      usecase.execute({
        originalUrl: 'https://example.com',
        expiresAt: '2020-01-01T00:00:00.000Z',
        userId: null,
      }),
    ).rejects.toThrow(ValidationError);

    expect(shortUrlRepository.create).not.toHaveBeenCalled();
  });

  it('uses the custom alias as the code when provided and available', async () => {
    const { shortUrlRepository, shortcodeGenerator } = buildDeps();

    shortcodeGenerator.generate.mockResolvedValue('aB3x');
    shortUrlRepository.findByCode.mockResolvedValue(null);
    shortUrlRepository.create.mockResolvedValue(
      buildShortUrl({ customAlias: 'my-alias' }),
    );

    const usecase = new CreateShortUrlUseCase(shortUrlRepository, shortcodeGenerator);

    const result = await usecase.execute({
      originalUrl: 'https://example.com',
      customAlias: 'my-alias',
      userId: 'user-1',
    });

    expect(shortUrlRepository.create).toHaveBeenCalledWith({
      originalUrl: 'https://example.com',
      shortcode: 'aB3x',
      userId: 'user-1',
      customAlias: 'my-alias',
      expiresAt: null,
    });
    expect(result.customAlias).toBe('my-alias');
  });

  it('throws ConflictError when the custom alias is already in use', async () => {
    const { shortUrlRepository, shortcodeGenerator } = buildDeps();

    shortUrlRepository.findByCode.mockResolvedValue(buildShortUrl({ customAlias: 'taken' }));

    const usecase = new CreateShortUrlUseCase(shortUrlRepository, shortcodeGenerator);

    await expect(
      usecase.execute({
        originalUrl: 'https://example.com',
        customAlias: 'taken',
        userId: null,
      }),
    ).rejects.toThrow(ConflictError);

    expect(shortcodeGenerator.generate).not.toHaveBeenCalled();
    expect(shortUrlRepository.create).not.toHaveBeenCalled();
  });

  it('retries shortcode generation when the candidate collides with an existing alias', async () => {
    const { shortUrlRepository, shortcodeGenerator } = buildDeps();

    shortcodeGenerator.generate
      .mockResolvedValueOnce('taken')
      .mockResolvedValueOnce('free1');

    shortUrlRepository.findByCode
      .mockResolvedValueOnce(buildShortUrl({ shortcode: 'taken' }))
      .mockResolvedValueOnce(null);

    shortUrlRepository.create.mockResolvedValue(buildShortUrl({ shortcode: 'free1' }));

    const usecase = new CreateShortUrlUseCase(shortUrlRepository, shortcodeGenerator);

    const result = await usecase.execute({
      originalUrl: 'https://example.com',
      userId: null,
    });

    expect(shortcodeGenerator.generate).toHaveBeenCalledTimes(2);
    expect(result.shortcode).toBe('free1');
  });
});
