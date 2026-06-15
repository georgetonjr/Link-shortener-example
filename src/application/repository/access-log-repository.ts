import { randomUUID } from 'node:crypto';
import type {
  AccessLogRepository,
  ClicksByDay,
  CreateAccessLogInput,
  RecentAccessesPage,
} from '@/domain/repository/access-log-repository';
import type { AccessLog } from '@/domain/entities/access-log';
import type { AccessLogRecord } from '@/application/repository/models/access-log';
import type { CassandraClient } from '@/infra/cassandra/client';

/**
 * Janela de leitura usada para agregar "cliques por dia" (ver get-url-stats,
 * tasks/05-stats.md). Mantém a tabela otimizada para escrita (um único INSERT
 * por acesso) sem depender de tabelas de counter à parte; a agregação por dia
 * é feita em memória sobre os acessos mais recentes.
 */
const DAILY_AGGREGATION_WINDOW = 1000;

/**
 * Implementação Cassandra do AccessLogRepository.
 *
 * Tabela esperada:
 *
 * CREATE TABLE access_logs (
 *   shortcode text,
 *   accessed_at timestamp,
 *   id uuid,
 *   referrer text,
 *   user_agent text,
 *   ip text,
 *   PRIMARY KEY (shortcode, accessed_at, id)
 * ) WITH CLUSTERING ORDER BY (accessed_at DESC, id DESC);
 *
 * Partition key shortcode + clustering por accessed_at DESC: escrita é um
 * único INSERT (otimizado para escrita) e a leitura mais recente primeiro
 * é a ordem natural da partição (otimizado para consulta por shortcode).
 */
export class CassandraAccessLogRepository implements AccessLogRepository {
  constructor(private readonly cassandra: CassandraClient) {}

  async create(input: CreateAccessLogInput): Promise<void> {
    await this.cassandra.execute(
      'INSERT INTO access_logs (shortcode, accessed_at, id, referrer, user_agent, ip) ' +
        'VALUES (?, ?, ?, ?, ?, ?)',
      [input.shortcode, new Date(), randomUUID(), input.referrer, input.userAgent, input.ip],
    );
  }

  async countByShortcodeGroupedByDay(shortcode: string): Promise<ClicksByDay[]> {
    const rows = await this.cassandra.execute<Pick<AccessLogRecord, 'accessed_at'>>(
      'SELECT accessed_at FROM access_logs WHERE shortcode = ? LIMIT ?',
      [shortcode, DAILY_AGGREGATION_WINDOW],
    );

    const clicksByDay = new Map<string, number>();

    for (const row of rows) {
      const day = toDayKey(row.accessed_at);
      clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
    }

    return Array.from(clicksByDay.entries())
      .map(([day, clicks]) => ({ day, clicks }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }

  async findRecentByShortcode(
    shortcode: string,
    limit: number,
    cursor: string | null,
  ): Promise<RecentAccessesPage> {
    const params: unknown[] = [shortcode];
    let query =
      'SELECT shortcode, accessed_at, referrer, user_agent, ip FROM access_logs WHERE shortcode = ?';

    if (cursor) {
      query += ' AND accessed_at < ?';
      params.push(new Date(cursor));
    }

    query += ' LIMIT ?';
    params.push(limit);

    const rows = await this.cassandra.execute<AccessLogRecord>(query, params);
    const items = rows.map(toEntity);
    const lastItem = items[items.length - 1];

    return {
      items,
      nextCursor: items.length === limit && lastItem ? lastItem.accessedAt.toISOString() : null,
    };
  }
}

function toDayKey(accessedAt: Date): string {
  return accessedAt.toISOString().slice(0, 10);
}

function toEntity(record: AccessLogRecord): AccessLog {
  return {
    shortcode: record.shortcode,
    accessedAt: record.accessed_at,
    referrer: record.referrer,
    userAgent: record.user_agent,
    ip: record.ip,
  };
}
