# contexto
Implementar autenticação de usuários (email/senha + JWT) para que cada usuário gerencie seus próprios links encurtados.

# tarefas
- [x] Criar entidade/model User (id, email, password_hash, created_at)
- [x] Criar repository de usuário (cassandra)
- [x] Criar usecase de cadastro (signup) - hash de senha com SALT_SECRET
- [x] Criar usecase de login - validação de credenciais e emissão de JWT
- [x] Criar middleware de autenticação (validação do JWT) para proteger rotas
- [x] Criar controllers/rotas: POST /auth/signup, POST /auth/login
- [x] Testes unitários dos usecases de signup/login
- [x] Testes de integração das rotas de auth

# estrutura
- domain/usecase: signup-user, login-user
- domain/repository: user-repository (interface)
- application/repository: user-repository (implementação cassandra)
- application/controller: auth-controller
- application/shared: auth-middleware (jwt)

# decision
- JWT simples, sem OAuth por enquanto
- Senha com hash + SALT_SECRET (variável de ambiente já definida na tarefa 01)
