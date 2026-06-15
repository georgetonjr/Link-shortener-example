# contexto
Documentação da API usando OpenAPI/Swagger, cobrindo todos os endpoints implementados.

# tarefas
- [x] Adicionar dependência de geração/exposição de Swagger (ex: @hono/swagger-ui + zod-to-openapi, conforme libs compatíveis com hono)
- [x] Documentar schemas de request/response (ShortUrl, User, AccessLog, erros)
- [x] Documentar endpoints: auth (signup/login), urls (create/list/update/delete), redirect, stats
- [x] Expor rota /docs com a UI do Swagger
- [x] Garantir que exemplos de erro (404, 410, 401, 409) estejam documentados

# decision
- Documentação gerada a partir dos schemas de validação (zod) já usados nos controllers, evitando duplicação
