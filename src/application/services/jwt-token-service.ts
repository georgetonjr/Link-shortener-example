import jwt from 'jsonwebtoken';
import type { TokenPayload, TokenService } from '@/domain/services/token-service';
import { UnauthorizedError } from '@/domain/shared/errors';
import { env } from '@/application/shared/env';

/**
 * Implementação de TokenService usando JSON Web Tokens.
 */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string = env.JWT_SECRET,
    private readonly expiresIn: string = env.JWT_EXPIRES_IN,
  ) {}

  sign(payload: TokenPayload): string {
    const options: jwt.SignOptions = {
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    };

    return jwt.sign(payload, this.secret, options);
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);

      if (typeof decoded === 'string' || !decoded.sub || !decoded.email) {
        throw new UnauthorizedError('Invalid token payload');
      }

      return { sub: decoded.sub, email: decoded.email as string };
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
