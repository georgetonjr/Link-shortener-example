import { randomUUID } from 'node:crypto';
import type { UserRepository } from '@/domain/repository/user-repository';
import type { UserWithCredentials } from '@/domain/entities/user';
import type { UserRecord } from '@/application/repository/models/user';
import type { CassandraClient } from '@/infra/cassandra/client';

/**
 * Implementação Cassandra do UserRepository.
 *
 * Tabela esperada:
 *
 * CREATE TABLE users (
 *   id uuid PRIMARY KEY,
 *   email text,
 *   password_hash text,
 *   created_at timestamp
 * );
 *
 * CREATE MATERIALIZED VIEW users_by_email AS
 *   SELECT * FROM users WHERE email IS NOT NULL AND id IS NOT NULL
 *   PRIMARY KEY (email, id);
 */
export class CassandraUserRepository implements UserRepository {
  constructor(private readonly cassandra: CassandraClient) {}

  async findByEmail(email: string): Promise<UserWithCredentials | null> {
    const rows = await this.cassandra.execute<UserRecord>(
      'SELECT id, email, password_hash, created_at FROM users_by_email WHERE email = ? LIMIT 1',
      [email],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    return toEntity(row);
  }

  async create(input: { email: string; passwordHash: string }): Promise<UserWithCredentials> {
    const record: UserRecord = {
      id: randomUUID(),
      email: input.email,
      password_hash: input.passwordHash,
      created_at: new Date(),
    };

    await this.cassandra.execute(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [record.id, record.email, record.password_hash, record.created_at],
    );

    return toEntity(record);
  }
}

function toEntity(record: UserRecord): UserWithCredentials {
  return {
    id: record.id,
    email: record.email,
    passwordHash: record.password_hash,
    createdAt: record.created_at,
  };
}
