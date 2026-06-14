import pino from 'pino';
import { env } from './env';
import { requestContext } from './request-context';

/**
 * Logger estruturado central da aplicação.
 * Todos os módulos devem usar este logger (logs estruturados ao invés de console.log),
 * conforme CODE_STANDARDS.md - Tratamento de erros / Observabilidade.
 *
 * O mixin injeta automaticamente o requestId do contexto atual (AsyncLocalStorage)
 * em toda chamada de log, em qualquer camada (controller, usecase, repository, infra),
 * sem precisar passá-lo explicitamente por parâmetro.
 */
export const logger = pino({
  level: env.ENV === 'test' ? 'silent' : 'info',
  transport:
    env.ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  mixin() {
    const requestId = requestContext.getRequestId();
    return requestId ? { requestId } : {};
  },
});
