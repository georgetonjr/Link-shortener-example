import type { UserWithCredentials } from '@/domain/entities/user';

/**
 * Interface de repositório de usuários.
 * Implementação concreta (Cassandra) em application/repository/user-repository.ts,
 * conforme CODE_STANDARDS.md - separação entre domínio e infraestrutura.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserWithCredentials | null>;
  create(input: { email: string; passwordHash: string }): Promise<UserWithCredentials>;
}
