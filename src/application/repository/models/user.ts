/**
 * Modelo de persistência do usuário (tabela `users` no Cassandra).
 */
export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
};
