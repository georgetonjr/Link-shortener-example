import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

/**
 * Estende o zod com `.openapi()` (ver tasks/07-api-docs.md).
 *
 * Controllers importam `z` deste módulo (em vez de `zod` diretamente) para
 * que os mesmos schemas usados em `zValidator` sirvam de fonte da verdade
 * para a documentação OpenAPI (ver shared/openapi-registry.ts), evitando
 * duplicação (decision da tarefa 07).
 */
extendZodWithOpenApi(z);

export { z };
