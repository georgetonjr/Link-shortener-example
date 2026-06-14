import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppBindings, AppVariables } from '@/application/shared/app-context';
import { CassandraUserRepository } from '@/application/repository/user-repository';
import { BcryptPasswordHasher } from '@/application/services/bcrypt-password-hasher';
import { JwtTokenService } from '@/application/services/jwt-token-service';
import { SignupUserUseCase } from '@/domain/usecase/signup-user';
import { LoginUserUseCase } from '@/domain/usecase/login-user';
import type { CassandraClient } from '@/infra/cassandra/client';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Controller de autenticação.
 * Fino: apenas valida input (zod), delega para o usecase e traduz o resultado em resposta HTTP.
 * Nenhuma regra de negócio aqui (ver CODE_STANDARDS.md - boas práticas com Hono).
 */
export function createAuthController(cassandra: CassandraClient) {
  const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

  const userRepository = new CassandraUserRepository(cassandra);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService();

  app.post('/signup', zValidator('json', signupSchema), async (c) => {
    const input = c.req.valid('json');

    const usecase = new SignupUserUseCase(userRepository, passwordHasher);
    const user = await usecase.execute(input);

    return c.json({ id: user.id, email: user.email, createdAt: user.createdAt }, 201);
  });

  app.post('/login', zValidator('json', loginSchema), async (c) => {
    const input = c.req.valid('json');

    const usecase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);
    const result = await usecase.execute(input);

    return c.json({ token: result.token }, 200);
  });

  return app;
}
