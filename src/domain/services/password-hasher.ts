/**
 * Interface de serviço de hashing de senha.
 * Implementação concreta (bcrypt + SALT_SECRET) em application/services.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}
