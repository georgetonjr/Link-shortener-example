# Comandos para finalizar a tarefa 09 (executar localmente)

```bash
cd ~/personal/Link-shortener-example

git checkout main
git pull
git checkout -b feature/09-observability-infra

# remover os arquivos antigos movidos para src/infra/
git rm src/application/repository/cassandra-client.ts
git rm src/application/repository/redis-client.ts

git add .
git commit -m "feat: requestId propagado em logs e pasta infra para cassandra/redis"

git push -u origin feature/09-observability-infra

gh pr create \
  --base main \
  --head feature/09-observability-infra \
  --title "feat: requestId em logs (todas as camadas) e pasta infra" \
  --body "Implementa a tarefa 09 (tasks/09-observability-infra.md): middleware de requestId com AsyncLocalStorage propagado a logger/error-handler em todas as camadas, e organização de clientes Cassandra/Redis em src/infra/."
```

Validar localmente:

```bash
bun install
bun run build
bun run test
```
