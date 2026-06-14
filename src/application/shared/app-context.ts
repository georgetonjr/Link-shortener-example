/**
 * Tipagem do contexto do Hono, reutilizada em toda a aplicação
 * (ver CODE_STANDARDS.md - boas práticas com Hono / Contexto e tipagem).
 */
export type AppVariables = {
  requestId: string;
  user?: {
    id: string;
    email: string;
  };
};

export type AppBindings = Record<string, never>;
