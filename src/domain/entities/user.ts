/**
 * Entidade de domínio User.
 * Representa um usuário autenticado, sem expor o hash de senha para fora do domínio.
 */
export type User = {
  id: string;
  email: string;
  createdAt: Date;
};

/** Representação interna usada apenas pelos usecases de autenticação. */
export type UserWithCredentials = User & {
  passwordHash: string;
};
