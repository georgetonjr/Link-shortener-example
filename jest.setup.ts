// Variáveis de ambiente padrão para execução de testes.
// Garante que src/application/shared/env.ts valide com sucesso sem depender
// de um .env real durante `bun run test` / CI.
process.env.ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.SALT_SECRET ??= 'test-salt-secret';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.JWT_EXPIRES_IN ??= '1d';
process.env.DATABASE_URL ??= 'cassandra://localhost:9042/link_shortener_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
