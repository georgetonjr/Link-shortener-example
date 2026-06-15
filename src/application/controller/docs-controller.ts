import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import type { AppBindings, AppVariables } from '@/application/shared/app-context';
import { generateOpenApiDocument } from '@/application/shared/openapi-registry';

/**
 * Controller de documentação da API (ver tasks/07-api-docs.md).
 * Expõe o documento OpenAPI gerado a partir dos schemas zod e a Swagger UI.
 */
export function createDocsController() {
  const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

  app.get('/openapi.json', (c) => c.json(generateOpenApiDocument()));
  app.get('/', swaggerUI({ url: '/docs/openapi.json' }));

  return app;
}
