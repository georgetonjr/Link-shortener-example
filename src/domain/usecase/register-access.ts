import type { AccessStatsRecorder } from '@/domain/services/access-stats-recorder';
import type { AccessLogRepository } from '@/domain/repository/access-log-repository';
import { logger } from '@/application/shared/logger';

export type RegisterAccessInput = {
  shortcode: string;
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
};

/**
 * Usecase de registro de acesso (ver tasks/05-stats.md), chamado pelo
 * redirect-url (tasks/04-redirect.md).
 *
 * Incrementa o contador de acessos (Redis, usado como total de cliques em
 * get-url-stats) e grava o histórico de acesso (Cassandra, usado para
 * cliques por dia e últimos acessos).
 *
 * Nunca lança erro: falhas de registro são logadas e não devem impedir o
 * redirecionamento do usuário (decision: não bloquear o redirect).
 */
export class RegisterAccessUseCase {
  constructor(
    private readonly accessStatsRecorder: AccessStatsRecorder,
    private readonly accessLogRepository: AccessLogRepository,
  ) {}

  async execute(input: RegisterAccessInput): Promise<void> {
    await Promise.all([
      this.accessStatsRecorder.recordAccess(input.shortcode),
      this.recordAccessLog(input),
    ]);
  }

  private async recordAccessLog(input: RegisterAccessInput): Promise<void> {
    try {
      await this.accessLogRepository.create({
        shortcode: input.shortcode,
        referrer: input.referrer,
        userAgent: input.userAgent,
        ip: input.ip,
      });
    } catch (error) {
      logger.error({ error, shortcode: input.shortcode }, 'Failed to register access log');
    }
  }
}
