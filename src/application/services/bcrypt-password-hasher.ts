import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '@/domain/services/password-hasher';
import { env } from '@/application/shared/env';

const SALT_ROUNDS = 10;

/**
 * Implementação de PasswordHasher usando bcrypt.
 *
 * SALT_SECRET é usado como um "pepper": concatenado à senha antes do hash,
 * de forma que mesmo um dump do banco de dados (com os salts do bcrypt, que
 * são armazenados junto ao hash) não seja suficiente para forçar as senhas
 * sem conhecer o segredo da aplicação.
 */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly pepper: string = env.SALT_SECRET) {}

  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(this.withPepper(plainPassword), SALT_ROUNDS);
  }

  async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(this.withPepper(plainPassword), passwordHash);
  }

  private withPepper(plainPassword: string): string {
    return `${plainPassword}${this.pepper}`;
  }
}
