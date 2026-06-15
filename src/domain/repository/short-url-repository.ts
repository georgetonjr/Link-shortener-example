import type { ShortUrl } from '@/domain/entities/short-url';

export type CreateShortUrlInput = {
  originalUrl: string;
  shortcode: string;
  userId: string | null;
  customAlias: string | null;
  expiresAt: Date | null;
};

/**
 * Repositório de URLs encurtadas.
 * Implementação concreta (Cassandra) em application/repository/short-url-repository.ts.
 */
export interface ShortUrlRepository {
  /** Busca por shortcode OU alias customizado (usado para checar disponibilidade e resolver redirecionamentos). */
  findByCode(code: string): Promise<ShortUrl | null>;

  create(input: CreateShortUrlInput): Promise<ShortUrl>;
}
