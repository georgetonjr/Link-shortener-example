# contexto
Padronizar observabilidade (requestId em todos os logs, em todas as camadas) e organizar
as configurações globais de infraestrutura (Cassandra e Redis) em uma pasta dedicada `infra/`.

# tarefas
- [x] Criar `src/application/shared/request-context.ts` com AsyncLocalStorage para propagar
  o requestId por toda a requisição (controllers, usecases, repositories, infra)
- [x] Criar `src/application/shared/request-id-middleware.ts`:
  - Usa o `x-request-id` recebido no header, ou gera um novo (uuid) caso ausente
  - Registra o requestId no AsyncLocalStorage e devolve no header de resposta
  - Deve ser o primeiro middleware registrado em `createApp()`
- [x] Atualizar `logger.ts` para injetar automaticamente o `requestId` (via `mixin`) em
  toda chamada de log, sem precisar passar explicitamente por parâmetro
- [x] Incluir `requestId` no corpo das respostas de erro (error-handler.ts)
- [x] Criar pasta `src/infra/` para configuração global de infraestrutura:
  - `src/infra/cassandra/client.ts` (movido de `application/repository/cassandra-client.ts`)
  - `src/infra/redis/client.ts` (movido de `application/repository/redis-client.ts`)
  - Repositories concretos (tarefas futuras) devem importar os clientes a partir de `infra/`
- [x] Atualizar `server.ts` e demais imports para os novos caminhos
- [x] Adicionar `jest.setup.ts` com env vars padrão de teste, configurado em `jest.config.ts`
  (necessário pois `env.ts` valida variáveis obrigatórias na carga do módulo)
- [x] Testes: middleware de requestId (gera novo id, propaga id recebido via header)

# decision
- requestId é gerado com `crypto.randomUUID()` quando não vier do client
- Propagação via AsyncLocalStorage evita ter que passar requestId manualmente por
  todas as assinaturas de função (usecases, repositories, gateways)
- `src/infra/` concentra apenas configuração/clientes de infraestrutura (conexão,
  driver). Repositories de domínio (cassandra) e implementações de cache (redis)
  continuam em `application/repository`, mas passam a depender dos clientes de `infra/`
