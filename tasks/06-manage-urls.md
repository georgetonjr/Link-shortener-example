# contexto
Gestão de URLs do usuário autenticado: listar, atualizar (alias/expiração) e remover seus links encurtados.

# tarefas
- Criar usecase list-user-urls (paginado)
- Criar usecase update-short-url (alterar alias e/ou expires_at, com validação de ownership)
- Criar usecase delete-short-url (remove do cassandra e invalida cache no redis)
- Criar controllers/rotas:
  - GET /urls (lista os links do usuário autenticado)
  - PATCH /urls/:shortcode
  - DELETE /urls/:shortcode
- Testes unitários dos usecases
- Testes de integração das rotas

# decision
- Todas as rotas exigem autenticação e validação de ownership (usuário só gerencia seus próprios links)
