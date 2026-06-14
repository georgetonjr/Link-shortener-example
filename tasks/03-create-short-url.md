# contexto
Funcionalidade principal: criar uma URL encurtada a partir de uma URL longa, com suporte a alias customizado e expiração opcional.

# tarefas
- Criar entidade/model ShortUrl (id, original_url, shortcode, user_id, custom_alias?, expires_at?, created_at)
- Criar repository de ShortUrl (cassandra)
- Implementar geração de shortcode_number via Redis INCR
- Implementar conversão do shortcode_number para base62 com salt (conforme decisão da tarefa 01)
- Criar usecase create-short-url:
  - Validar URL de entrada
  - Se alias customizado informado, validar disponibilidade
  - Se expires_at informado, validar formato/futuro
  - Persistir associação user_id (se autenticado) <-> shortcode
- Criar controller/rota: POST /urls (autenticação opcional, vincula ao usuário se houver token)
- Testes unitários do usecase (geração de shortcode, alias, expiração)
- Testes de integração da rota POST /urls

# decision
- Alias customizado tem prioridade sobre o shortcode gerado, mas precisa ser único
- Expiração é opcional (campo nullable)
