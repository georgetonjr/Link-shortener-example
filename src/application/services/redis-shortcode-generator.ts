import type { ShortcodeGenerator } from '@/domain/services/shortcode-generator';
import type { RedisClient } from '@/infra/redis/client';
import { env } from '@/application/shared/env';

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE62_LENGTH = BASE62_ALPHABET.length;
const SHORTCODE_LENGTH = 4;
const SHORTCODE_COUNTER_KEY = 'shortcode:counter';

/**
 * Gera shortcodes de 4 caracteres a partir de um contador incremental do Redis
 * (INCR, sem colisões), convertido para base62 e embaralhado com SALT_SECRET
 * (ver tasks/01-setup-config.md - decisão de shortcode).
 */
export class RedisShortcodeGenerator implements ShortcodeGenerator {
  constructor(
    private readonly redis: RedisClient,
    private readonly salt: string = env.SALT_SECRET,
  ) {}

  async generate(): Promise<string> {
    const sequence = await this.redis.incr(SHORTCODE_COUNTER_KEY);

    return toBase62WithSalt(sequence, this.salt);
  }
}

/**
 * Converte um número sequencial em um código base62 de tamanho fixo,
 * usando o salt para embaralhar a posição de cada caractere no alfabeto.
 * Garante shortcodes não previsíveis sem depender de aleatoriedade
 * (e portanto sem risco de colisão, já que a sequência é única).
 */
function toBase62WithSalt(sequence: number, salt: string): string {
  const saltOffset = hashSalt(salt);
  const digits: number[] = [];

  let remaining = sequence;

  for (let position = 0; position < SHORTCODE_LENGTH; position += 1) {
    digits.push(remaining % BASE62_LENGTH);
    remaining = Math.floor(remaining / BASE62_LENGTH);
  }

  return digits
    .map((digit, position) => {
      const shifted = (digit + saltOffset + position) % BASE62_LENGTH;
      return BASE62_ALPHABET[shifted];
    })
    .reverse()
    .join('');
}

function hashSalt(salt: string): number {
  let hash = 0;

  for (let i = 0; i < salt.length; i += 1) {
    hash = (hash * 31 + salt.charCodeAt(i)) % BASE62_LENGTH;
  }

  return hash;
}
