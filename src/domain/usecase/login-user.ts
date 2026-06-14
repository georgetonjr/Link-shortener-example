import type { UserRepository } from '@/domain/repository/user-repository';
import type { PasswordHasher } from '@/domain/services/password-hasher';
import type { TokenService } from '@/domain/services/token-service';
import { UnauthorizedError } from '@/domain/shared/errors';
import { logger } from '@/application/shared/logger';

export type LoginUserInput = {
  email: string;
  password: string;
};

export type LoginUserOutput = {
  token: string;
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

/**
 * Usecase de login de usuário.
 * Regra de negócio isolada de infraestrutura (ver CODE_STANDARDS.md):
 * depende apenas de interfaces (UserRepository, PasswordHasher, TokenService).
 */
export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Mesma mensagem de erro para usuário inexistente ou senha incorreta,
      // evitando enumeração de emails cadastrados.
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await this.passwordHasher.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = this.tokenService.sign({ sub: user.id, email: user.email });

    logger.info({ userId: user.id }, 'User logged in');

    return { token };
  }
}
