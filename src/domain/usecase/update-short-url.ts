import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortUrlCache } from '@/domain/services/short-url-cache';
import type { ShortUrl } from '@/domain/entities/short-url';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/domain/shared/errors';

export type UpdateShortUrlInput = {
  shortcode: string;
  userId: string;
  /** undefined = mantém o valor atual, null = remove o alias, string = novo alias */
  customAlias?: string | null;
  /** undefined = mantém o valor atual, null = remove a expiração, string = nova data ISO 8601 */
  expiresAt?: string | null;
};

/**
 * Usecase de atualização de URL encurtada (ver tasks/06-manage-urls.md).
 *
 * Apenas o dono do link pode alterá-lo (decision). Atualiza tanto a entrada
 * principal quanto as tabelas de lookup (short_url_codes, short_urls_by_user)
 * e invalida o cache (ver tasks/04-redirect.md) das chaves afetadas.
 */
export class UpdateShortUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly shortUrlCache: ShortUrlCache,
  ) {}

  async execute(input: UpdateShortUrlInput): Promise<ShortUrl> {
    const shortUrl = await this.shortUrlRepository.findByCode(input.shortcode);

    if (!shortUrl) {
      throw new NotFoundError('Short URL not found');
    }

    if (shortUrl.userId !== input.userId) {
      throw new ForbiddenError('You do not have access to this short URL');
    }

    const customAlias =
      input.customAlias === undefined ? shortUrl.customAlias : input.customAlias;
    const expiresAt =
      input.expiresAt === undefined ? shortUrl.expiresAt : parseExpiresAt(input.expiresAt);

    if (customAlias && customAlias !== shortUrl.customAlias) {
      await this.ensureAliasIsAvailable(customAlias, shortUrl.id);
    }

    const updated = await this.shortUrlRepository.update({
      id: shortUrl.id,
      shortcode: shortUrl.shortcode,
      originalUrl: shortUrl.originalUrl,
      userId: shortUrl.userId,
      createdAt: shortUrl.createdAt,
      previousCustomAlias: shortUrl.customAlias,
      customAlias,
      expiresAt,
    });

    await this.invalidateCache(shortUrl, customAlias);

    return updated;
  }

  private async ensureAliasIsAvailable(customAlias: string, shortUrlId: string): Promise<void> {
    const existing = await this.shortUrlRepository.findByCode(customAlias);

    if (existing && existing.id !== shortUrlId) {
      throw new ConflictError('Custom alias is already in use');
    }
  }

  private async invalidateCache(shortUrl: ShortUrl, newCustomAlias: string | null): Promise<void> {
    const codes = new Set<string>([shortUrl.shortcode]);

    if (shortUrl.customAlias) {
      codes.add(shortUrl.customAlias);
    }

    if (newCustomAlias) {
      codes.add(newCustomAlias);
    }

    await Promise.all([...codes].map((code) => this.shortUrlCache.delete(code)));
  }
}

function parseExpiresAt(expiresAt: string | null): Date | null {
  if (expiresAt === null) {
    return null;
  }

  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError('expiresAt must be a valid date');
  }

  if (date.getTime() <= Date.now()) {
    throw new ValidationError('expiresAt must be a date in the future');
  }

  return date;
}
