import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  GoneError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/domain/shared/errors';
import { logger } from './logger';
import { requestContext } from './request-context';

const STATUS_BY_ERROR = new Map<new (...args: never[]) => DomainError, number>([
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [GoneError, 410],
]);

/**
 * Error handler central da aplicação (app.onError).
 * Único ponto de tradução de erros de domínio para respostas HTTP,
 * conforme CODE_STANDARDS.md - boas práticas com Hono.
 */
export function errorHandler(error: Error, c: Context): Response {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  const requestId = requestContext.getRequestId();

  if (error instanceof DomainError) {
    const status = STATUS_BY_ERROR.get(
      error.constructor as new (...args: never[]) => DomainError,
    ) ?? 400;

    logger.warn({ error, code: error.code, path: c.req.path }, error.message);

    return c.json(
      { error: error.code, message: error.message, requestId },
      status as 400,
    );
  }

  logger.error({ error, path: c.req.path }, 'Unhandled error');

  return c.json(
    { error: 'INTERNAL_SERVER_ERROR', message: 'Unexpected error', requestId },
    500,
  );
}
