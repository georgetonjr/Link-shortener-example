# Link Shortener

Encurtador de URLs construído com Hono, Bun, TypeScript, Cassandra e Redis.

## Requisitos

- [Bun](https://bun.sh) >= 1.1
- Docker e Docker Compose

## Setup

```bash
cp .env.example .env
bun install
docker compose up -d
bun run dev
```

Health check: `GET http://localhost:3000/health`

Documentação da API (Swagger UI): `GET http://localhost:3000/docs`

## Scripts

- `bun run dev` — inicia o servidor em modo watch
- `bun run start` — inicia o servidor
- `bun run build` — type-check (tsc --noEmit)
- `bun run test` — executa os testes (Jest)
- `bun run test:coverage` — testes com cobertura
- `bun run lint` — lint (ESLint)

## Estrutura

```
src/
  domain/
    usecase/        # regras de negócio (orquestram repositories/services)
    services/       # interfaces de serviços de domínio
    repository/     # interfaces de repositórios
  application/
    controller/     # rotas Hono (fino, sem regra de negócio)
    services/       # implementações concretas de serviços
    repository/      # implementações concretas de repositórios (cassandra/redis)
      models/        # modelos de dados
    shared/          # env, logger, error handler, tipos de contexto
  tests/             # testes
```

## Documentação

- [tasks/](./tasks) — especificação de cada etapa do desenvolvimento
- [CODE_STANDARDS.md](./CODE_STANDARDS.md) — padrões de código do projeto
