import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortUrlCache } from '@/domain/services/short-url-cache';
import { ForbiddenError, NotFoundError } from '@/domain/shared/errors';

export type DeleteShortUrlInput = {
  shortcode: string;
  userId: string;
};

/**
 * Usecase de remoção de URL encurtada (ver tasks/06-manage-urls.md).
 *
 * Apenas o dono do link pode removê-lo (decision). Remove a entrada do
 * Cassandra (tabelas short_urls, short_url_codes e short_urls_by_user) e
 * invalida o cache (ver tasks/04-redirect.md) das chaves afetadas.
 */
export class DeleteShortUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly shortUrlCache: ShortUrlCache,
  ) {}

  async execute(input: DeleteShortUrlInput): Promise<void> {
    const shortUrl = await this.shortUrlRepository.findByCode(input.shortcode);

    if (!shortUrl) {
      throw new NotFoundError('Short URL not found');
    }

    if (shortUrl.userId !== input.userId) {
      throw new ForbiddenError('You do not have access to this short URL');
    }

    await this.shortUrlRepository.delete(shortUrl);

    const codes = new Set<string>([shortUrl.shortcode]);

    if (shortUrl.customAlias) {
      codes.add(shortUrl.customAlias);
    }

    await Promise.all([...codes].map((code) => this.shortUrlCache.delete(code)));
  }
}
