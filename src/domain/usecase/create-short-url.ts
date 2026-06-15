import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { ShortcodeGenerator } from '@/domain/services/shortcode-generator';
import type { ShortUrl } from '@/domain/entities/short-url';
import { ConflictError, ValidationError } from '@/domain/shared/errors';
import { logger } from '@/application/shared/logger';

const MAX_SHORTCODE_ATTEMPTS = 5;

export type CreateShortUrlInput = {
  originalUrl: string;
  customAlias?: string;
  expiresAt?: string;
  userId: string | null;
};

/**
 * Usecase de criação de URL encurtada.
 *
 * - Se alias customizado for informado, ele tem prioridade sobre o shortcode gerado,
 *   mas precisa ser único (ver tasks/03-create-short-url.md - decision).
 * - expiresAt é opcional; quando informado, precisa ser uma data futura válida.
 * - Vincula ao usuário autenticado (userId), se houver.
 */
export class CreateShortUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly shortcodeGenerator: ShortcodeGenerator,
  ) {}

  async execute(input: CreateShortUrlInput): Promise<ShortUrl> {
    validateOriginalUrl(input.originalUrl);

    const expiresAt = parseExpiresAt(input.expiresAt);

    if (input.customAlias) {
      await this.ensureAliasIsAvailable(input.customAlias);
    }

    const shortcode = await this.generateUniqueShortcode();

    const shortUrl = await this.shortUrlRepository.create({
      originalUrl: input.originalUrl,
      shortcode,
      userId: input.userId,
      customAlias: input.customAlias ?? null,
      expiresAt,
    });

    logger.info(
      { shortUrlId: shortUrl.id, shortcode: shortUrl.shortcode, userId: input.userId },
      'Short URL created',
    );

    return shortUrl;
  }

  private async ensureAliasIsAvailable(customAlias: string): Promise<void> {
    const existing = await this.shortUrlRepository.findByCode(customAlias);

    if (existing) {
      throw new ConflictError('Custom alias is already in use');
    }
  }

  /**
   * Gera um shortcode garantindo que não colida com um alias customizado já existente.
   * O contador do Redis (ver RedisShortcodeGenerator) já garante unicidade entre
   * shortcodes gerados; esta verificação cobre apenas a colisão com aliases manuais.
   */
  private async generateUniqueShortcode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_SHORTCODE_ATTEMPTS; attempt += 1) {
      const candidate = await this.shortcodeGenerator.generate();
      const existing = await this.shortUrlRepository.findByCode(candidate);

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictError('Unable to generate a unique shortcode, please try again');
  }
}

function validateOriginalUrl(originalUrl: string): void {
  try {
    const url = new URL(originalUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ValidationError('originalUrl must use http or https protocol');
    }
  } catch {
    throw new ValidationError('originalUrl must be a valid URL');
  }
}

function parseExpiresAt(expiresAt: string | undefined): Date | null {
  if (!expiresAt) {
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
