import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { signupSchema, loginSchema } from '@/application/controller/auth-controller';
import { redirectParamsSchema } from '@/application/controller/redirect-controller';
import {
  createShortUrlSchema,
  shortcodeParamsSchema,
  statsQuerySchema,
  listUserUrlsQuerySchema,
  updateShortUrlSchema,
} from '@/application/controller/short-url-controller';
import {
  errorResponseSchema,
  userResponseSchema,
  authTokenResponseSchema,
  shortUrlResponseSchema,
  listUrlsResponseSchema,
  statsResponseSchema,
} from '@/application/shared/openapi-schemas';

/**
 * Registro central da documentação OpenAPI (ver tasks/07-api-docs.md).
 *
 * Reaproveita os schemas zod usados pelo `zValidator` nos controllers como
 * fonte da verdade para request bodies/params/query (decision da tarefa 07,
 * evita duplicação). Apenas os shapes de resposta possuem schemas dedicados
 * (ver shared/openapi-schemas.ts).
 */
const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent('securitySchemes', 'BearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const jsonContent = <T extends object>(schema: T) => ({
  content: { 'application/json': { schema } },
});

registry.registerPath({
  method: 'post',
  path: '/auth/signup',
  tags: ['Auth'],
  summary: 'Cria uma nova conta de usuário',
  request: { body: { ...jsonContent(signupSchema), required: true } },
  responses: {
    201: { description: 'Usuário criado com sucesso', ...jsonContent(userResponseSchema) },
    400: { description: 'Dados de entrada inválidos', ...jsonContent(errorResponseSchema) },
    409: { description: 'Email já cadastrado', ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Autentica um usuário e retorna um token JWT',
  request: { body: { ...jsonContent(loginSchema), required: true } },
  responses: {
    200: { description: 'Login realizado com sucesso', ...jsonContent(authTokenResponseSchema) },
    400: { description: 'Dados de entrada inválidos', ...jsonContent(errorResponseSchema) },
    401: { description: 'Email ou senha inválidos', ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: 'post',
  path: '/urls',
  tags: ['URLs'],
  summary: 'Cria uma URL encurtada',
  description:
    'Autenticação opcional: se um token válido for enviado, a URL criada é vinculada ao usuário autenticado.',
  security: [{ [bearerAuth.name]: [] }, {}],
  request: { body: { ...jsonContent(createShortUrlSchema), required: true } },
  responses: {
    201: { description: 'URL encurtada criada com sucesso', ...jsonContent(shortUrlResponseSchema) },
    400: { description: 'Dados de entrada inválidos', ...jsonContent(errorResponseSchema) },
    409: { description: 'Alias customizado já em uso', ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: 'get',
  path: '/urls',
  tags: ['URLs'],
  summary: 'Lista as URLs encurtadas do usuário autenticado',
  security: [{ [bearerAuth.name]: [] }],
  request: { query: listUserUrlsQuerySchema },
  responses: {
    200: { description: 'Lista paginada de URLs do usuário', ...jsonContent(listUrlsResponseSchema) },
    401: { description: 'Token de autenticação ausente ou inválido', ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/urls/{shortcode}',
  tags: ['URLs'],
  summary: 'Atualiza o alias customizado e/ou a expiração de uma URL encurtada',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: shortcodeParamsSchema,
    body: { ...jsonContent(updateShortUrlSchema), required: true },
  },
  responses: {
    200: { description: 'URL atualizada com sucesso', ...jsonContent(shortUrlResponseSchema) },
    400: { description: 'Dados de entrada inválidos', ...jsonContent(errorResponseSchema) },
    401: { description: 'Token de autenticação ausente ou inválido', ...jsonContent(errorResponseSchema) },
    403: { description: 'A URL não pertence ao usuário autenticado', ...jsonContent(errorResponseSchema) },
    404: { description: 'URL encurtada não encontrada', ...jsonContent(errorResponseSchema) },
    409: { description: 'Alias customizado já em uso', ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/urls/{shortcode}',
  tags: ['URLs'],
  summary: 'Remove uma URL encurtada',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: shortcodeParamsSchema },
  responses: {
    204: { description: 'URL removida com sucesso' },
    401: { description: 'Token de autenticação ausente ou inválido', ...jsonContent(errorResponseSchema) },
    403: { description: 'A URL não pertence ao usuário autenticado', ...jsonContent(errorResponseSchema) },
    404: { description: 'URL encurtada não encontrada', ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: 'get',
  path: '/urls/{shortcode}/stats',
  tags: ['URLs'],
  summary: 'Retorna estatísticas de acesso de uma URL encurtada',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: shortcodeParamsSchema, query: statsQuerySchema },
  responses: {
    200: { description: 'Estatísticas da URL', ...jsonContent(statsResponseSchema) },
    400: { description: 'Parâmetros de busca inválidos', ...jsonContent(errorResponseSchema) },
    401: { description: 'Token de autenticação ausente ou inválido', ...jsonContent(errorResponseSchema) },
    403: { description: 'A URL não pertence ao usuário autenticado', ...jsonContent(errorResponseSchema) },
    404: { description: 'URL encurtada não encontrada', ...jsonContent(errorResponseSchema) },
  },
});

registry.registerPath({
  method: 'get',
  path: '/{shortcode}',
  tags: ['Redirect'],
  summary: 'Redireciona para a URL original',
  request: { params: redirectParamsSchema },
  responses: {
    302: { description: 'Redirecionamento para a URL original' },
    404: { description: 'URL encurtada não encontrada', ...jsonContent(errorResponseSchema) },
    410: { description: 'URL encurtada expirada', ...jsonContent(errorResponseSchema) },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Link Shortener API',
      version: '0.1.0',
      description: 'API de encurtamento de URLs com autenticação, estatísticas e gestão de URLs.',
    },
    servers: [{ description: 'Servidor local', url: 'http://localhost:3000' }],
  });
}
