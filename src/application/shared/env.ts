import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ENV: z.enum(['development', 'test', 'production']).default('development'),
  SALT_SECRET: z.string().min(1, 'SALT_SECRET is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Carrega e valida as variáveis de ambiente uma única vez.
 * Lança erro explícito na inicialização caso alguma variável obrigatória esteja ausente,
 * evitando falhas silenciosas em tempo de execução (ver CODE_STANDARDS.md - código defensivo).
 */
function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
