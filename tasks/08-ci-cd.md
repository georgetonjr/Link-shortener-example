# contexto
Pipeline de CI/CD para garantir qualidade do código a cada push/PR.

# tarefas
- [x] Criar workflow (ex: GitHub Actions) com etapas:
  - [x] Instalar dependências (bun install)
  - [x] Lint (configurar eslint/biome conforme padrão do projeto)
  - [x] Type-check (tsc --noEmit)
  - [x] Testes (jest) com cobertura mínima definida
  - [x] Build do projeto
- [x] Configurar execução do docker-compose (cassandra + redis) no pipeline para os testes de integração
- [x] Cache de dependências do bun no pipeline para acelerar execução
- [x] Badge de status do pipeline no README

# decision
- Pipeline deve falhar caso lint, type-check ou testes não passem
- Testes de integração rodam contra os serviços do docker-compose (tarefa 01)
