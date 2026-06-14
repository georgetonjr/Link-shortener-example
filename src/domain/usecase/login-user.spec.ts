import { describe, expect, it, jest } from '@jest/globals';
import { LoginUserUseCase } from './login-user';
import { UnauthorizedError } from '@/domain/shared/errors';
import type { UserRepository } from '@/domain/repository/user-repository';
import type { PasswordHasher } from '@/domain/services/password-hasher';
import type { TokenService } from '@/domain/services/token-service';

function buildDeps() {
  const userRepository = {
    findByEmail: jest.fn<UserRepository['findByEmail']>(),
    create: jest.fn<UserRepository['create']>(),
  } satisfies UserRepository;

  const passwordHasher = {
    hash: jest.fn<PasswordHasher['hash']>(),
    compare: jest.fn<PasswordHasher['compare']>(),
  } satisfies PasswordHasher;

  const tokenService = {
    sign: jest.fn<TokenService['sign']>(),
    verify: jest.fn<TokenService['verify']>(),
  } satisfies TokenService;

  return { userRepository, passwordHasher, tokenService };
}

describe('LoginUserUseCase', () => {
  it('returns a token for valid credentials', async () => {
    const { userRepository, passwordHasher, tokenService } = buildDeps();

    userRepository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
    });
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.sign.mockReturnValue('signed-jwt');

    const usecase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);

    const result = await usecase.execute({ email: 'user@example.com', password: 'secret123' });

    expect(tokenService.sign).toHaveBeenCalledWith({ sub: 'user-1', email: 'user@example.com' });
    expect(result).toEqual({ token: 'signed-jwt' });
  });

  it('throws UnauthorizedError when user does not exist', async () => {
    const { userRepository, passwordHasher, tokenService } = buildDeps();

    userRepository.findByEmail.mockResolvedValue(null);

    const usecase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);

    await expect(
      usecase.execute({ email: 'missing@example.com', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when password is incorrect', async () => {
    const { userRepository, passwordHasher, tokenService } = buildDeps();

    userRepository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
    });
    passwordHasher.compare.mockResolvedValue(false);

    const usecase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);

    await expect(
      usecase.execute({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedError);

    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
