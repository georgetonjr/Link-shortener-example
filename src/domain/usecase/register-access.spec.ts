import { describe, expect, it, jest } from '@jest/globals';
import { RegisterAccessUseCase } from './register-access';
import type { AccessStatsRecorder } from '@/domain/services/access-stats-recorder';
import type { AccessLogRepository } from '@/domain/repository/access-log-repository';

function buildDeps() {
  const accessStatsRecorder = {
    recordAccess: jest.fn<AccessStatsRecorder['recordAccess']>().mockResolvedValue(undefined),
    getAccessCount: jest.fn<AccessStatsRecorder['getAccessCount']>(),
  } satisfies AccessStatsRecorder;

  const accessLogRepository = {
    create: jest.fn<AccessLogRepository['create']>().mockResolvedValue(undefined),
    countByShortcodeGroupedByDay: jest.fn<AccessLogRepository['countByShortcodeGroupedByDay']>(),
    findRecentByShortcode: jest.fn<AccessLogRepository['findRecentByShortcode']>(),
  } satisfies AccessLogRepository;

  return { accessStatsRecorder, accessLogRepository };
}

const input = {
  shortcode: 'aB3x',
  referrer: 'https://google.com',
  userAgent: 'jest-test',
  ip: '127.0.0.1',
};

describe('RegisterAccessUseCase', () => {
  it('increments the access counter and persists the access log', async () => {
    const { accessStatsRecorder, accessLogRepository } = buildDeps();

    const usecase = new RegisterAccessUseCase(accessStatsRecorder, accessLogRepository);

    await usecase.execute(input);

    expect(accessStatsRecorder.recordAccess).toHaveBeenCalledWith('aB3x');
    expect(accessLogRepository.create).toHaveBeenCalledWith({
      shortcode: 'aB3x',
      referrer: 'https://google.com',
      userAgent: 'jest-test',
      ip: '127.0.0.1',
    });
  });

  it('does not throw when persisting the access log fails', async () => {
    const { accessStatsRecorder, accessLogRepository } = buildDeps();

    accessLogRepository.create.mockRejectedValue(new Error('cassandra unavailable'));

    const usecase = new RegisterAccessUseCase(accessStatsRecorder, accessLogRepository);

    await expect(usecase.execute(input)).resolves.toBeUndefined();
    expect(accessStatsRecorder.recordAccess).toHaveBeenCalledWith('aB3x');
  });
});
