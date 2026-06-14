/**
 * Erros de domínio tipados.
 *
 * Usecases lançam estes erros; o error handler central do Hono (application/shared/error-handler.ts)
 * é o único responsável por traduzi-los para status HTTP, conforme CODE_STANDARDS.md.
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}

export class GoneError extends DomainError {
  readonly code = 'GONE';
}
