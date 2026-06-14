import { Client, types } from 'cassandra-driver';
import { env } from '@/application/shared/env';
import { logger } from '@/application/shared/logger';

/**
 * Wrapper sobre o driver do Cassandra.
 * Configuração global de conexão com o Cassandra (ver src/infra).
 * Encapsula a dependência de infraestrutura para que repositories possam ser
 * testados com mocks, conforme CODE_STANDARDS.md - dependências escondidas.
 */
export class CassandraClient {
  private readonly client: Client;

  constructor(databaseUrl: string = env.DATABASE_URL) {
    const url = new URL(databaseUrl);

    this.client = new Client({
      contactPoints: [url.hostname],
      localDataCenter: 'dc1',
      keyspace: url.pathname.replace(/^\//, '') || undefined,
      protocolOptions: { port: Number(url.port) || 9042 },
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    logger.info('Cassandra connected');
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
  }

  /**
   * Executa uma query.
   * @param consistency Consistency level. Padrão ONE para leituras (ver tasks/04-redirect.md):
   * o shortcode é escrito uma única vez e não é atualizado, então quorum não é necessário.
   */
  async execute<T extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    params: unknown[] = [],
    consistency: types.consistencies = types.consistencies.one,
  ): Promise<T[]> {
    const result = await this.client.execute(query, params, {
      prepare: true,
      consistency,
    });

    return result.rows as unknown as T[];
  }

  /** Execução em lote (ex: IN clauses) para evitar consultas N+1 - ver CODE_STANDARDS.md */
  async executeBatch(queries: { query: string; params: unknown[] }[]): Promise<void> {
    await this.client.batch(queries, { prepare: true });
  }
}
