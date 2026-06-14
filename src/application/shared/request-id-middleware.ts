import type { MiddlewareHandler } from 'hono';
import { randomUUID } from 'node:crypto';
import { requestContext } from './request-context';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Middleware que gera (ou propaga, se vier do header) um requestId por requisição
 * e o disponibiliza para todas as camadas via AsyncLocalStorage (request-context.ts).
 *
 * Deve ser o primeiro middleware registrado em createApp(), para que o requestId
 * esteja disponível em todos os logs subsequentes (logger, error handler, usecases,
 * repositories).
 */
export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header(REQUEST_ID_HEADER) ?? randomUUID();

  c.set('requestId', requestId);
  c.header(REQUEST_ID_HEADER, requestId);

  await requestContext.run({ requestId }, async () => {
    await next();
  });
};
