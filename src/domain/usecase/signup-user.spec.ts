import { describe, expect, it, jest } from '@jest/globals';
import { SignupUserUseCase } from './signup-user';
import { ConflictError } from '@/domain/shared/errors';
import type { UserRepository } from '@/domain/repository/user-repository';
import type { PasswordHasher } from '@/domain/services/password-hasher';

function buildDeps() {
  const userRepository = {
    findByEmail: jest.fn<UserRepository['findByEmail']>(),
    create: jest.fn<UserRepository['create']>(),
  } satisfies UserRepository;

  const passwordHasher = {
    hash: jest.fn<PasswordHasher['hash']>(),
    compare: jest.fn<PasswordHasher['compare']>(),
  } satisfies PasswordHasher;

  return { userRepository, passwordHasher };
}

describe('SignupUserUseCase', () => {
  it('creates a new user with a hashed password', async () => {
    const { userRepository, passwordHasher } = buildDeps();

    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed-password');
    userRepository.create.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-01'),
    });

    const usecase = new SignupUserUseCase(userRepository, passwordHasher);

    const result = await usecase.execute({ email: 'User@Example.com', password: 'secret123' });

    expect(passwordHasher.hash).toHaveBeenCalledWith('secret123');
    expect(userRepository.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: 'hashed-password',
    });
    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      createdAt: new Date('2026-01-01'),
    });
  });

  it('throws ConflictError when email is already registered', async () => {
    const { userRepository, passwordHasher } = buildDeps();

    userRepository.findByEmail.mockResolvedValue({
      id: 'existing-user',
      email: 'user@example.com',
      passwordHash: 'hash',
      createdAt: new Date(),
    });

    const usecase = new SignupUserUseCase(userRepository, passwordHasher);

    await expect(
      usecase.execute({ email: 'user@example.com', password: 'secret123' }),
    ).rejects.toThrow(ConflictError);

    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
