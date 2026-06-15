import type { AccessStatsRecorder } from '@/domain/services/access-stats-recorder';
import type { RedisClient } from '@/infra/redis/client';
import { logger } from '@/application/shared/logger';

const ACCESS_COUNTER_KEY_PREFIX = 'shorturl:access:';

/**
 * Registra acessos a URLs encurtadas incrementando um contador no Redis
 * (ver tasks/04-redirect.md e tasks/05-stats.md).
 *
 * O incremento é feito de forma assíncrona em relação ao redirecionamento:
 * falhas ao registrar a estatística não devem impedir o redirecionamento
 * do usuário, apenas são logadas.
 */
export class RedisAccessStatsRecorder implements AccessStatsRecorder {
  constructor(private readonly redis: RedisClient) {}

  async recordAccess(shortcode: string): Promise<void> {
    try {
      await this.redis.incr(accessCounterKey(shortcode));
    } catch (error) {
      logger.error({ error, shortcode }, 'Failed to record short URL access');
    }
  }

  async getAccessCount(shortcode: string): Promise<number> {
    const value = await this.redis.get(accessCounterKey(shortcode));

    return value ? Number.parseInt(value, 10) : 0;
  }
}

function accessCounterKey(shortcode: string): string {
  return `${ACCESS_COUNTER_KEY_PREFIX}${shortcode}`;
}
