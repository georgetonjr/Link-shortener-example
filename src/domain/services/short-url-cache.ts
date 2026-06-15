import type { ShortUrl } from '@/domain/entities/short-url';

/**
 * Cache-aside para URLs encurtadas (ver tasks/04-redirect.md).
 * Implementado em application/services com Redis, TTL configurável e
 * política de eviction (allkeys-lru/allkeys-lfu) configurada na infra.
 */
export interface ShortUrlCache {
  get(code: string): Promise<ShortUrl | null>;
  set(code: string, shortUrl: ShortUrl): Promise<void>;

  /** Invalida a entrada em cache (ver tasks/06-manage-urls.md - alteração/remoção de links). */
  delete(code: string): Promise<void>;
}
