import type { ShortUrl } from '@/domain/entities/short-url';
import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortUrlCache } from '@/domain/services/short-url-cache';
import type { AccessStatsRecorder } from '@/domain/services/access-stats-recorder';
import { GoneError, NotFoundError } from '@/domain/shared/errors';

export type RedirectUrlInput = {
  code: string;
};

export type RedirectUrlOutput = {
  originalUrl: string;
};

/**
 * Usecase de redirecionamento (ver tasks/04-redirect.md).
 *
 * Estratégia cache-aside: tenta o cache (Redis) antes do Cassandra; em cache
 * miss, busca no Cassandra (consistency level ONE) e popula o cache com TTL.
 * URLs expiradas retornam GoneError (410) e não são redirecionadas.
 */
export class RedirectUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly shortUrlCache: ShortUrlCache,
    private readonly accessStatsRecorder: AccessStatsRecorder,
  ) {}

  async execute(input: RedirectUrlInput): Promise<RedirectUrlOutput> {
    const shortUrl = await this.findShortUrl(input.code);

    if (!shortUrl) {
      throw new NotFoundError('Short URL not found');
    }

    if (isExpired(shortUrl)) {
      throw new GoneError('Short URL has expired');
    }

    await this.accessStatsRecorder.recordAccess(input.code);

    return { originalUrl: shortUrl.originalUrl };
  }

  private async findShortUrl(code: string): Promise<ShortUrl | null> {
    const cached = await this.shortUrlCache.get(code);

    if (cached) {
      return cached;
    }

    const shortUrl = await this.shortUrlRepository.findByCode(code);

    if (shortUrl) {
      await this.shortUrlCache.set(code, shortUrl);
    }

    return shortUrl;
  }
}

function isExpired(shortUrl: ShortUrl): boolean {
  return shortUrl.expiresAt !== null && shortUrl.expiresAt.getTime() <= Date.now();
}
