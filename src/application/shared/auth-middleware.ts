import type { MiddlewareHandler } from 'hono';
import { UnauthorizedError } from '@/domain/shared/errors';
import type { TokenService } from '@/domain/services/token-service';
import { JwtTokenService } from '@/application/services/jwt-token-service';

const BEARER_PREFIX = 'Bearer ';

/**
 * Middleware de autenticação obrigatória.
 * Valida o JWT do header Authorization e injeta o usuário no contexto (c.set('user', ...)),
 * conforme CODE_STANDARDS.md - boas práticas com Hono / Middlewares.
 */
export function authMiddleware(
  tokenService: TokenService = new JwtTokenService(),
): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(BEARER_PREFIX.length);
    const payload = tokenService.verify(token);

    c.set('user', { id: payload.sub, email: payload.email });

    await next();
  };
}

/**
 * Middleware de autenticação opcional.
 * Se um token válido for fornecido, injeta o usuário no contexto; caso contrário,
 * segue sem autenticação (usado em rotas públicas que opcionalmente vinculam ao usuário,
 * ex: POST /urls - ver tasks/03-create-short-url.md).
 */
export function optionalAuthMiddleware(
  tokenService: TokenService = new JwtTokenService(),
): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (authHeader?.startsWith(BEARER_PREFIX)) {
      const token = authHeader.slice(BEARER_PREFIX.length);

      try {
        const payload = tokenService.verify(token);
        c.set('user', { id: payload.sub, email: payload.email });
      } catch {
        // Token inválido em rota opcional: ignora e segue como anônimo.
      }
    }

    await next();
  };
}
