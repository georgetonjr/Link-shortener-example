# contexto
Funcionalidade principal: criar uma URL encurtada a partir de uma URL longa, com suporte a alias customizado e expiração opcional.

# tarefas
- [x] Criar entidade/model ShortUrl (id, original_url, shortcode, user_id, custom_alias?, expires_at?, created_at)
- [x] Criar repository de ShortUrl (cassandra)
- [x] Implementar geração de shortcode_number via Redis INCR
- [x] Implementar conversão do shortcode_number para base62 com salt (conforme decisão da tarefa 01)
- [x] Criar usecase create-short-url:
  - [x] Validar URL de entrada
  - [x] Se alias customizado informado, validar disponibilidade
  - [x] Se expires_at informado, validar formato/futuro
  - [x] Persistir associação user_id (se autenticado) <-> shortcode
- [x] Criar controller/rota: POST /urls (autenticação opcional, vincula ao usuário se houver token)
- [x] Testes unitários do usecase (geração de shortcode, alias, expiração)
- [x] Testes de integração da rota POST /urls

# decision
- Alias customizado tem prioridade sobre o shortcode gerado, mas precisa ser único
- Expiração é opcional (campo nullable)
