import type { UserRepository } from '@/domain/repository/user-repository';
import type { PasswordHasher } from '@/domain/services/password-hasher';
import type { User } from '@/domain/entities/user';
import { ConflictError } from '@/domain/shared/errors';
import { logger } from '@/application/shared/logger';

export type SignupUserInput = {
  email: string;
  password: string;
};

/**
 * Usecase de cadastro de usuário.
 * Regra de negócio isolada de infraestrutura (ver CODE_STANDARDS.md):
 * depende apenas de interfaces (UserRepository, PasswordHasher).
 */
export class SignupUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: SignupUserInput): Promise<User> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = await this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
    });

    logger.info({ userId: user.id }, 'User created');

    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
