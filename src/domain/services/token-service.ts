/**
 * Interface de serviço de geração/validação de tokens de autenticação (JWT).
 * Implementação concreta em application/services.
 */
export type TokenPayload = {
  sub: string;
  email: string;
};

export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
