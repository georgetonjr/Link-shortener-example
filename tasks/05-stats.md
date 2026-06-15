# contexto
Estatísticas de acesso por link encurtado: total de cliques e histórico/metadados de acesso (data, origem).

# tarefas
- [x] Criar entidade/model AccessLog (shortcode, timestamp, referrer?, user_agent?, ip?)
- [x] Criar repository de AccessLog (cassandra, otimizado para escrita e consulta por shortcode)
- [x] Criar usecase register-access (chamado pelo redirect, tarefa 04)
- [x] Criar usecase get-url-stats:
  - [x] Total de cliques
  - [x] Cliques agrupados por dia
  - [x] Últimos acessos (paginado)
- [x] Criar controller/rota: GET /urls/:shortcode/stats (requer autenticação e ownership do link)
- [x] Testes unitários dos usecases de stats
- [x] Testes de integração da rota de stats

# decision
- Registro de acesso não deve bloquear o redirecionamento (idealmente assíncrono/fire-and-forget)
- Apenas o dono do link pode ver as estatísticas
