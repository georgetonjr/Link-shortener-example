import type { ShortUrl } from '@/domain/entities/short-url';
import type { ShortUrlCache } from '@/domain/services/short-url-cache';
import type { RedisClient } from '@/infra/redis/client';
import { logger } from '@/application/shared/logger';

const CACHE_KEY_PREFIX = 'shorturl:cache:';
const CACHE_TTL_SECONDS = 60 * 60; // 1 hora

type CachedShortUrl = {
  id: string;
  originalUrl: string;
  shortcode: string;
  userId: string | null;
  customAlias: string | null;
  expiresAt: string | null;
  createdAt: string;
};

/**
 * Cache-aside de URLs encurtadas via Redis (ver tasks/04-redirect.md).
 *
 * TTL fixo de 1h por entrada; a política de eviction (allkeys-lru/allkeys-lfu)
 * configurada no Redis garante que os links mais acessados permaneçam em
 * memória sem cálculo manual de popularidade.
 */
export class RedisShortUrlCache implements ShortUrlCache {
  constructor(
    private readonly redis: RedisClient,
    private readonly ttlSeconds: number = CACHE_TTL_SECONDS,
  ) {}

  async get(code: string): Promise<ShortUrl | null> {
    const raw = await this.redis.get(cacheKey(code));

    if (!raw) {
      return null;
    }

    try {
      return fromCached(JSON.parse(raw) as CachedShortUrl);
    } catch (error) {
      logger.warn({ error, code }, 'Failed to parse cached short URL, ignoring cache entry');
      return null;
    }
  }

  async set(code: string, shortUrl: ShortUrl): Promise<void> {
    await this.redis.set(cacheKey(code), JSON.stringify(toCached(shortUrl)), this.ttlSeconds);
  }

  async delete(code: string): Promise<void> {
    await this.redis.del(cacheKey(code));
  }
}

function cacheKey(code: string): string {
  return `${CACHE_KEY_PREFIX}${code}`;
}

function toCached(shortUrl: ShortUrl): CachedShortUrl {
  return {
    id: shortUrl.id,
    originalUrl: shortUrl.originalUrl,
    shortcode: shortUrl.shortcode,
    userId: shortUrl.userId,
    customAlias: shortUrl.customAlias,
    expiresAt: shortUrl.expiresAt ? shortUrl.expiresAt.toISOString() : null,
    createdAt: shortUrl.createdAt.toISOString(),
  };
}

function fromCached(cached: CachedShortUrl): ShortUrl {
  return {
    id: cached.id,
    originalUrl: cached.originalUrl,
    shortcode: cached.shortcode,
    userId: cached.userId,
    customAlias: cached.customAlias,
    expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
    createdAt: new Date(cached.createdAt),
  };
}
