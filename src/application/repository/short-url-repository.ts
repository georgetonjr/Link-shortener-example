import { randomUUID } from 'node:crypto';
import type {
  CreateShortUrlInput,
  ShortUrlRepository,
  UpdateShortUrlInput,
  UserUrlsPage,
} from '@/domain/repository/short-url-repository';
import type { ShortUrl } from '@/domain/entities/short-url';
import type { ShortUrlRecord } from '@/application/repository/models/short-url';
import type { CassandraClient } from '@/infra/cassandra/client';

/**
 * Implementação Cassandra do ShortUrlRepository.
 *
 * Tabela esperada:
 *
 * CREATE TABLE short_urls (
 *   id uuid PRIMARY KEY,
 *   original_url text,
 *   shortcode text,
 *   custom_alias text,
 *   user_id uuid,
 *   expires_at timestamp,
 *   created_at timestamp
 * );
 *
 * Tabela de lookup por código (shortcode OU alias customizado), usada tanto para
 * checar disponibilidade de alias quanto para resolver redirecionamentos
 * (ver tasks/04-redirect.md). Escrita uma única vez por URL, leitura com
 * consistency level ONE (padrão de CassandraClient.execute).
 *
 * CREATE TABLE short_url_codes (
 *   code text PRIMARY KEY,
 *   short_url_id uuid,
 *   original_url text,
 *   user_id uuid,
 *   expires_at timestamp,
 *   created_at timestamp
 * );
 *
 * Tabela de lookup por usuário (ver tasks/06-manage-urls.md), particionada por
 * user_id e ordenada por created_at DESC para listar os links do usuário mais
 * recentes primeiro, paginados por cursor.
 *
 * CREATE TABLE short_urls_by_user (
 *   user_id uuid,
 *   created_at timestamp,
 *   id uuid,
 *   original_url text,
 *   shortcode text,
 *   custom_alias text,
 *   expires_at timestamp,
 *   PRIMARY KEY (user_id, created_at, id)
 * ) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);
 */
export class CassandraShortUrlRepository implements ShortUrlRepository {
  constructor(private readonly cassandra: CassandraClient) {}

  async findByCode(code: string): Promise<ShortUrl | null> {
    const rows = await this.cassandra.execute<ShortUrlRecord>(
      'SELECT id, original_url, shortcode, custom_alias, user_id, expires_at, created_at ' +
        'FROM short_url_codes WHERE code = ? LIMIT 1',
      [code],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return toEntity(row);
  }

  async create(input: CreateShortUrlInput): Promise<ShortUrl> {
    const record: ShortUrlRecord = {
      id: randomUUID(),
      original_url: input.originalUrl,
      shortcode: input.shortcode,
      custom_alias: input.customAlias,
      user_id: input.userId,
      expires_at: input.expiresAt,
      created_at: new Date(),
    };

    const code = input.customAlias ?? input.shortcode;

    const queries = [
      {
        query:
          'INSERT INTO short_urls (id, original_url, shortcode, custom_alias, user_id, expires_at, created_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [
          record.id,
          record.original_url,
          record.shortcode,
          record.custom_alias,
          record.user_id,
          record.expires_at,
          record.created_at,
        ],
      },
      {
        query:
          'INSERT INTO short_url_codes (code, short_url_id, original_url, user_id, expires_at, created_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?)',
        params: [
          code,
          record.id,
          record.original_url,
          record.user_id,
          record.expires_at,
          record.created_at,
        ],
      },
    ];

    if (record.user_id) {
      queries.push({
        query:
          'INSERT INTO short_urls_by_user (user_id, created_at, id, original_url, shortcode, custom_alias, expires_at) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [
          record.user_id,
          record.created_at,
          record.id,
          record.original_url,
          record.shortcode,
          record.custom_alias,
          record.expires_at,
        ],
      });
    }

    await this.cassandra.executeBatch(queries);

    return toEntity(record);
  }

  async findManyByUserId(userId: string, limit: number, cursor: string | null): Promise<UserUrlsPage> {
    const params: unknown[] = [userId];
    let query =
      'SELECT id, original_url, shortcode, custom_alias, user_id, expires_at, created_at ' +
      'FROM short_urls_by_user WHERE user_id = ?';

    if (cursor) {
      query += ' AND created_at < ?';
      params.push(new Date(cursor));
    }

    query += ' LIMIT ?';
    params.push(limit);

    const rows = await this.cassandra.execute<ShortUrlRecord>(query, params);
    const items = rows.map(toEntity);
    const lastItem = items[items.length - 1];

    return {
      items,
      nextCursor: items.length === limit && lastItem ? lastItem.createdAt.toISOString() : null,
    };
  }

  async update(input: UpdateShortUrlInput): Promise<ShortUrl> {
    const queries = [
      {
        query: 'UPDATE short_urls SET custom_alias = ?, expires_at = ? WHERE id = ?',
        params: [input.customAlias, input.expiresAt, input.id],
      },
      {
        query: 'UPDATE short_url_codes SET expires_at = ? WHERE code = ?',
        params: [input.expiresAt, input.shortcode],
      },
    ];

    if (input.previousCustomAlias !== input.customAlias) {
      if (input.previousCustomAlias) {
        queries.push({
          query: 'DELETE FROM short_url_codes WHERE code = ?',
          params: [input.previousCustomAlias],
        });
      }

      if (input.customAlias) {
        queries.push({
          query:
            'INSERT INTO short_url_codes (code, short_url_id, original_url, user_id, expires_at, created_at) ' +
            'VALUES (?, ?, ?, ?, ?, ?)',
          params: [
            input.customAlias,
            input.id,
            input.originalUrl,
            input.userId,
            input.expiresAt,
            input.createdAt,
          ],
        });
      }
    } else if (input.customAlias) {
      queries.push({
        query: 'UPDATE short_url_codes SET expires_at = ? WHERE code = ?',
        params: [input.expiresAt, input.customAlias],
      });
    }

    if (input.userId) {
      queries.push({
        query:
          'UPDATE short_urls_by_user SET custom_alias = ?, expires_at = ? ' +
          'WHERE user_id = ? AND created_at = ? AND id = ?',
        params: [input.customAlias, input.expiresAt, input.userId, input.createdAt, input.id],
      });
    }

    await this.cassandra.executeBatch(queries);

    return {
      id: input.id,
      originalUrl: input.originalUrl,
      shortcode: input.shortcode,
      userId: input.userId,
      customAlias: input.customAlias,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt,
    };
  }

  async delete(shortUrl: ShortUrl): Promise<void> {
    const queries: { query: string; params: unknown[] }[] = [
      { query: 'DELETE FROM short_urls WHERE id = ?', params: [shortUrl.id] },
      { query: 'DELETE FROM short_url_codes WHERE code = ?', params: [shortUrl.shortcode] },
    ];

    if (shortUrl.customAlias) {
      queries.push({
        query: 'DELETE FROM short_url_codes WHERE code = ?',
        params: [shortUrl.customAlias],
      });
    }

    if (shortUrl.userId) {
      queries.push({
        query: 'DELETE FROM short_urls_by_user WHERE user_id = ? AND created_at = ? AND id = ?',
        params: [shortUrl.userId, shortUrl.createdAt, shortUrl.id],
      });
    }

    await this.cassandra.executeBatch(queries);
  }
}

function toEntity(record: ShortUrlRecord): ShortUrl {
  return {
    id: record.id,
    originalUrl: record.original_url,
    shortcode: record.shortcode,
    userId: record.user_id,
    customAlias: record.custom_alias,
    expiresAt: record.expires_at,
    createdAt: record.created_at,
  };
}
