import type { AccessLog } from '@/domain/entities/access-log';

export type CreateAccessLogInput = {
  shortcode: string;
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
};

export type ClicksByDay = {
  day: string;
  clicks: number;
};

export type RecentAccessesPage = {
  items: AccessLog[];
  nextCursor: string | null;
};

/**
 * Repositório de logs de acesso a URLs encurtadas (ver tasks/05-stats.md).
 * Implementação concreta (Cassandra) em application/repository/access-log-repository.ts.
 */
export interface AccessLogRepository {
  create(input: CreateAccessLogInput): Promise<void>;

  /** Cliques agrupados por dia, mais recentes primeiro. */
  countByShortcodeGroupedByDay(shortcode: string): Promise<ClicksByDay[]>;

  /** Últimos acessos, mais recentes primeiro, paginados por cursor (ISO date do último item da página anterior). */
  findRecentByShortcode(
    shortcode: string,
    limit: number,
    cursor: string | null,
  ): Promise<RecentAccessesPage>;
}
