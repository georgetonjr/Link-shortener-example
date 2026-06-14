# contexto
Funcionalidade de redirecionamento: ao acessar a URL encurtada, redirecionar para a URL original, respeitando expiração e registrando estatísticas de acesso.

# tarefas
- Criar usecase redirect-url:
  - Buscar shortcode no cache Redis (cache-aside); em cache miss, buscar no cassandra (consistency level ONE) e popular o Redis com TTL
  - Validar se a URL não expirou (retornar 410 Gone se expirada)
  - Incrementar contador de acessos do shortcode (ex: Redis)
  - Disparar registro de estatística de acesso (assíncrono ou síncrono)
- Configurar política de eviction do Redis (allkeys-lru ou allkeys-lfu) e TTL padrão das entradas
- Criar controller/rota: GET /:shortcode (redirect 302 para a URL original)
- Tratar shortcode inexistente (404)
- Testes unitários do usecase de redirecionamento (cache hit, cache miss com populate, expirado, não encontrado)
- Testes de integração da rota GET /:shortcode

# decision
- Cache-aside: tenta Redis antes do Cassandra; em miss, busca no Cassandra e grava no Redis com TTL
- Leitura no Cassandra com consistency level ONE (não precisa de quorum, pois a URL é escrita uma única vez e não é atualizada)
- Eviction por LRU/LFU (maxmemory-policy allkeys-lru ou allkeys-lfu) garante que os links mais acessados permaneçam naturalmente no cache, sem cálculo manual de popularidade
- URLs expiradas retornam 410 e não redirecionam
- Redirecionamento sempre temporário (302), nunca permanente (301), para permitir alteração/expiração do link e garantir registro correto de estatísticas
