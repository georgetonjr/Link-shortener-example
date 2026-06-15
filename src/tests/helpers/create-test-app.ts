import { jest } from '@jest/globals';
import type { CassandraClient } from '@/infra/cassandra/client';
import type { RedisClient } from '@/infra/redis/client';
import { createApp, type App } from '@/application/app';

export type MockCassandraClient = {
  execute: jest.Mock<CassandraClient['execute']>;
  executeBatch: jest.Mock<CassandraClient['executeBatch']>;
  connect: jest.Mock<CassandraClient['connect']>;
  shutdown: jest.Mock<CassandraClient['shutdown']>;
};

export type MockRedisClient = {
  connect: jest.Mock<RedisClient['connect']>;
  shutdown: jest.Mock<RedisClient['shutdown']>;
  incr: jest.Mock<RedisClient['incr']>;
  get: jest.Mock<RedisClient['get']>;
  set: jest.Mock<RedisClient['set']>;
  mget: jest.Mock<RedisClient['mget']>;
  del: jest.Mock<RedisClient['del']>;
};

/**
 * Cria uma instância da aplicação para testes, com CassandraClient e RedisClient mockáveis.
 * Por padrão, `execute` retorna uma lista vazia (ex: usuário/URL não encontrados) e
 * `incr` retorna 1 (primeiro shortcode gerado).
 */
export function createTestApp(
  cassandraOverrides: Partial<MockCassandraClient> = {},
  redisOverrides: Partial<MockRedisClient> = {},
): { app: App; cassandra: MockCassandraClient; redis: MockRedisClient } {
  const cassandra: MockCassandraClient = {
    execute: jest.fn<CassandraClient['execute']>().mockResolvedValue([]),
    executeBatch: jest.fn<CassandraClient['executeBatch']>().mockResolvedValue(undefined),
    connect: jest.fn<CassandraClient['connect']>().mockResolvedValue(undefined),
    shutdown: jest.fn<CassandraClient['shutdown']>().mockResolvedValue(undefined),
    ...cassandraOverrides,
  };

  const redis: MockRedisClient = {
    connect: jest.fn<RedisClient['connect']>().mockResolvedValue(undefined),
    shutdown: jest.fn<RedisClient['shutdown']>().mockResolvedValue(undefined),
    incr: jest.fn<RedisClient['incr']>().mockResolvedValue(1),
    get: jest.fn<RedisClient['get']>().mockResolvedValue(null),
    set: jest.fn<RedisClient['set']>().mockResolvedValue(undefined),
    mget: jest.fn<RedisClient['mget']>().mockResolvedValue([]),
    del: jest.fn<RedisClient['del']>().mockResolvedValue(undefined),
    ...redisOverrides,
  };

  const app = createApp({
    cassandra: cassandra as unknown as CassandraClient,
    redis: redis as unknown as RedisClient,
  });

  return { app, cassandra, redis };
}
