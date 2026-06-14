import Redis from 'ioredis';
import { env } from '@/application/shared/env';
import { logger } from '@/application/shared/logger';

/**
 * Wrapper sobre o cliente Redis.
 * Configuração global de conexão com o Redis (ver src/infra).
 * Usado tanto para o gerador de shortcode (INCR) quanto para cache-aside
 * de URLs (ver tasks/03 e tasks/04).
 */
export class RedisClient {
  readonly client: Redis;

  constructor(redisUrl: string = env.REDIS_URL) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    logger.info('Redis connected');
  }

  async shutdown(): Promise<void> {
    this.client.disconnect();
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /** Busca múltiplas chaves de uma vez (evita N comandos GET em loop - ver CODE_STANDARDS.md) */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mget(keys);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
