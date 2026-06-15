# contexto
Gestão de URLs do usuário autenticado: listar, atualizar (alias/expiração) e remover seus links encurtados.

# tarefas
- [x] Criar usecase list-user-urls (paginado)
- [x] Criar usecase update-short-url (alterar alias e/ou expires_at, com validação de ownership)
- [x] Criar usecase delete-short-url (remove do cassandra e invalida cache no redis)
- [x] Criar controllers/rotas:
  - [x] GET /urls (lista os links do usuário autenticado)
  - [x] PATCH /urls/:shortcode
  - [x] DELETE /urls/:shortcode
- [x] Testes unitários dos usecases
- [x] Testes de integração das rotas

# decision
- Todas as rotas exigem autenticação e validação de ownership (usuário só gerencia seus próprios links)
