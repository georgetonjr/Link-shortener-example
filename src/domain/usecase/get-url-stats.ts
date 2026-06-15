import type { ShortUrlRepository } from '@/domain/repository/short-url-repository';
import type { AccessStatsRecorder } from '@/domain/services/access-stats-recorder';
import type {
  AccessLogRepository,
  ClicksByDay,
  RecentAccessesPage,
} from '@/domain/repository/access-log-repository';
import { ForbiddenError, NotFoundError } from '@/domain/shared/errors';

const DEFAULT_RECENT_ACCESSES_LIMIT = 20;

export type GetUrlStatsInput = {
  shortcode: string;
  userId: string;
  recentLimit?: number;
  recentCursor?: string | null;
};

export type GetUrlStatsOutput = {
  shortcode: string;
  totalClicks: number;
  clicksByDay: ClicksByDay[];
  recentAccesses: RecentAccessesPage;
};

/**
 * Usecase de estatísticas de uma URL encurtada (ver tasks/05-stats.md).
 *
 * - totalClicks: lido do contador Redis (AccessStatsRecorder), incrementado
 *   a cada redirecionamento (tasks/04-redirect.md) - leitura O(1).
 * - clicksByDay e recentAccesses: lidos do histórico de acessos (Cassandra).
 *
 * Apenas o dono do link pode ver as estatísticas (decision).
 */
export class GetUrlStatsUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly accessStatsRecorder: AccessStatsRecorder,
    private readonly accessLogRepository: AccessLogRepository,
  ) {}

  async execute(input: GetUrlStatsInput): Promise<GetUrlStatsOutput> {
    const shortUrl = await this.shortUrlRepository.findByCode(input.shortcode);

    if (!shortUrl) {
      throw new NotFoundError('Short URL not found');
    }

    if (shortUrl.userId !== input.userId) {
      throw new ForbiddenError('You do not have access to this short URL');
    }

    const recentLimit = input.recentLimit ?? DEFAULT_RECENT_ACCESSES_LIMIT;

    const [totalClicks, clicksByDay, recentAccesses] = await Promise.all([
      this.accessStatsRecorder.getAccessCount(shortUrl.shortcode),
      this.accessLogRepository.countByShortcodeGroupedByDay(shortUrl.shortcode),
      this.accessLogRepository.findRecentByShortcode(
        shortUrl.shortcode,
        recentLimit,
        input.recentCursor ?? null,
      ),
    ]);

    return {
      shortcode: shortUrl.shortcode,
      totalClicks,
      clicksByDay,
      recentAccesses,
    };
  }
}
