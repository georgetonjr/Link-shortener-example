import { Hono } from 'hono';
import { logger as honoLogger } from 'hono/logger';
import type { AppBindings, AppVariables } from '@/application/shared/app-context';
import { errorHandler } from '@/application/shared/error-handler';
import { requestIdMiddleware } from '@/application/shared/request-id-middleware';

export type App = Hono<{ Bindings: AppBindings; Variables: AppVariables }>;

/**
 * Cria a instância da aplicação Hono.
 * Rotas de cada domínio são registradas via app.route() (ver CODE_STANDARDS.md).
 *
 * requestIdMiddleware deve ser o primeiro middleware: garante que o requestId
 * esteja disponível em todos os logs (controllers, usecases, repositories, infra)
 * via AsyncLocalStorage (ver shared/request-context.ts).
 */
export function createApp(): App {
  const app: App = new Hono();

  app.use('*', requestIdMiddleware);
  app.use('*', honoLogger());

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.onError(errorHandler);

  return app;
}
