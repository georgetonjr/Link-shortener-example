import type { ShortUrl } from '@/domain/entities/short-url';

export type CreateShortUrlInput = {
  originalUrl: string;
  shortcode: string;
  userId: string | null;
  customAlias: string | null;
  expiresAt: Date | null;
};

export type UpdateShortUrlInput = {
  id: string;
  shortcode: string;
  originalUrl: string;
  userId: string | null;
  createdAt: Date;
  previousCustomAlias: string | null;
  customAlias: string | null;
  expiresAt: Date | null;
};

export type UserUrlsPage = {
  items: ShortUrl[];
  nextCursor: string | null;
};

/**
 * Repositório de URLs encurtadas.
 * Implementação concreta (Cassandra) em application/repository/short-url-repository.ts.
 */
export interface ShortUrlRepository {
  /** Busca por shortcode OU alias customizado (usado para checar disponibilidade e resolver redirecionamentos). */
  findByCode(code: string): Promise<ShortUrl | null>;

  create(input: CreateShortUrlInput): Promise<ShortUrl>;

  /** Lista as URLs do usuário, mais recentes primeiro, paginadas por cursor (ISO date do último item da página anterior). */
  findManyByUserId(userId: string, limit: number, cursor: string | null): Promise<UserUrlsPage>;

  /** Atualiza alias e/ou expiração, mantendo as tabelas de lookup (short_url_codes, short_urls_by_user) consistentes. */
  update(input: UpdateShortUrlInput): Promise<ShortUrl>;

  /** Remove a URL e suas entradas de lookup (short_url_codes, short_urls_by_user). */
  delete(shortUrl: ShortUrl): Promise<void>;
}
