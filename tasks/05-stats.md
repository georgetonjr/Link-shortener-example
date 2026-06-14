# contexto
Estatísticas de acesso por link encurtado: total de cliques e histórico/metadados de acesso (data, origem).

# tarefas
- Criar entidade/model AccessLog (shortcode, timestamp, referrer?, user_agent?, ip?)
- Criar repository de AccessLog (cassandra, otimizado para escrita e consulta por shortcode)
- Criar usecase register-access (chamado pelo redirect, tarefa 04)
- Criar usecase get-url-stats:
  - Total de cliques
  - Cliques agrupados por dia
  - Últimos acessos (paginado)
- Criar controller/rota: GET /urls/:shortcode/stats (requer autenticação e ownership do link)
- Testes unitários dos usecases de stats
- Testes de integração da rota de stats

# decision
- Registro de acesso não deve bloquear o redirecionamento (idealmente assíncrono/fire-and-forget)
- Apenas o dono do link pode ver as estatísticas
