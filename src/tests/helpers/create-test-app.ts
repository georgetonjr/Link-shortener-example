import { jest } from '@jest/globals';
import type { CassandraClient } from '@/infra/cassandra/client';
import { createApp, type App } from '@/application/app';

export type MockCassandraClient = {
  execute: jest.Mock<CassandraClient['execute']>;
  executeBatch: jest.Mock<CassandraClient['executeBatch']>;
  connect: jest.Mock<CassandraClient['connect']>;
  shutdown: jest.Mock<CassandraClient['shutdown']>;
};

/**
 * Cria uma instância da aplicação para testes, com um CassandraClient mockável.
 * Por padrão, `execute` retorna uma lista vazia (ex: usuário não encontrado).
 */
export function createTestApp(
  cassandraOverrides: Partial<MockCassandraClient> = {},
): { app: App; cassandra: MockCassandraClient } {
  const cassandra: MockCassandraClient = {
    execute: jest.fn<CassandraClient['execute']>().mockResolvedValue([]),
    executeBatch: jest.fn<CassandraClient['executeBatch']>().mockResolvedValue(undefined),
    connect: jest.fn<CassandraClient['connect']>().mockResolvedValue(undefined),
    shutdown: jest.fn<CassandraClient['shutdown']>().mockResolvedValue(undefined),
    ...cassandraOverrides,
  };

  const app = createApp({ cassandra: cassandra as unknown as CassandraClient });

  return { app, cassandra };
}
