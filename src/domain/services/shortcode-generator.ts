/**
 * Gerador de shortcodes.
 * Implementação concreta usa Redis INCR + base62 com salt (ver tasks/01-setup-config.md
 * e application/services/redis-shortcode-generator.ts).
 */
export interface ShortcodeGenerator {
  generate(): Promise<string>;
}
