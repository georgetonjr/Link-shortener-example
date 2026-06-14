# Comandos para finalizar a tarefa 01 (executar localmente)

```bash
cd ~/personal/Link-shortener-example

# se houver lock travado do git
rm -f .git/index.lock

git checkout -b feature/01-setup-config

git add .
git commit -m "feat: setup inicial do projeto (hono, bun, ts, docker, env)"

git push -u origin feature/01-setup-config

gh pr create \
  --base main \
  --head feature/01-setup-config \
  --title "feat: setup inicial do projeto" \
  --body "Implementa a tarefa 01 (tasks/01-setup-config.md): Hono + Bun + TypeScript + Jest, docker-compose com Cassandra e Redis (allkeys-lru), validação de variáveis de ambiente, logger estruturado, error handler central e estrutura de pastas conforme CODE_STANDARDS.md."
```

Depois de abrir o PR, rode localmente para validar:

```bash
bun install
bun run build
bun run test
```
