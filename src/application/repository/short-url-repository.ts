import { randomUUID } from 'node:crypto';
import type {
  CreateShortUrlInput,
  ShortUrlRepository,
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

    await this.cassandra.executeBatch(queries);

    return toEntity(record);
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
