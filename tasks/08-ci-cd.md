# contexto
Pipeline de CI/CD para garantir qualidade do código a cada push/PR.

# tarefas
- Criar workflow (ex: GitHub Actions) com etapas:
  - Instalar dependências (bun install)
  - Lint (configurar eslint/biome conforme padrão do projeto)
  - Type-check (tsc --noEmit)
  - Testes (jest) com cobertura mínima definida
  - Build do projeto
- Configurar execução do docker-compose (cassandra + redis) no pipeline para os testes de integração
- Cache de dependências do bun no pipeline para acelerar execução
- Badge de status do pipeline no README

# decision
- Pipeline deve falhar caso lint, type-check ou testes não passem
- Testes de integração rodam contra os serviços do docker-compose (tarefa 01)
