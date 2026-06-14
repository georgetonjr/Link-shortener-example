# Comandos para finalizar a tarefa 02 (executar localmente)

```bash
cd ~/personal/Link-shortener-example

git checkout main
git pull
git checkout -b feature/02-auth

git add .
git commit -m "feat: autenticação de usuários (signup/login com JWT)"

git push -u origin feature/02-auth

gh pr create \
  --base main \
  --head feature/02-auth \
  --title "feat: autenticação (signup/login JWT)" \
  --body "Implementa a tarefa 02 (tasks/02-auth.md): entidade User, UserRepository (interface + implementação Cassandra), PasswordHasher (bcrypt + SALT_SECRET como pepper), TokenService (JWT), usecases de signup/login, middlewares de autenticação (obrigatória e opcional) e controller POST /auth/signup, POST /auth/login. Testes unitários dos usecases e testes de integração das rotas."
```

Validar localmente:

```bash
bun install
bun run build
bun run test
```

## Notas
- Tabela Cassandra esperada (ver comentário em `src/application/repository/user-repository.ts`):
  `users` (id, email, password_hash, created_at) + materialized view `users_by_email`.
- `createApp()` agora recebe `{ cassandra }` como dependência — qualquer novo teste de
  integração deve usar `src/tests/helpers/create-test-app.ts`.
