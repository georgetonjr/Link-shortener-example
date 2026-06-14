import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de requisição propagado via AsyncLocalStorage.
 *
 * Permite que qualquer camada (controller, usecase, repository, infra) acesse
 * o requestId atual sem precisar recebê-lo explicitamente por parâmetro,
 * garantindo que todos os logs da requisição sejam correlacionáveis
 * (ver CODE_STANDARDS.md - Observabilidade).
 */
export type RequestContext = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run<T>(context: RequestContext, callback: () => T): T {
    return storage.run(context, callback);
  },

  get(): RequestContext | undefined {
    return storage.getStore();
  },

  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
