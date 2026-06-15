/**
 * Registro de estatísticas de acesso a URLs encurtadas (ver tasks/04-redirect.md
 * e tasks/05-stats.md). A implementação incrementa um contador (ex: Redis INCR)
 * a cada redirecionamento bem-sucedido.
 */
export interface AccessStatsRecorder {
  recordAccess(shortcode: string): Promise<void>;

  /** Total de acessos registrados para o shortcode (ver tasks/05-stats.md). */
  getAccessCount(shortcode: string): Promise<number>;
}
