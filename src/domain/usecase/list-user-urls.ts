import type { ShortUrlRepository, UserUrlsPage } from '@/domain/repository/short-url-repository';

const DEFAULT_LIMIT = 20;

export type ListUserUrlsInput = {
  userId: string;
  limit?: number;
  cursor?: string | null;
};

/**
 * Usecase de listagem paginada das URLs encurtadas do usuário autenticado
 * (ver tasks/06-manage-urls.md).
 */
export class ListUserUrlsUseCase {
  constructor(private readonly shortUrlRepository: ShortUrlRepository) {}

  async execute(input: ListUserUrlsInput): Promise<UserUrlsPage> {
    const limit = input.limit ?? DEFAULT_LIMIT;

    return this.shortUrlRepository.findManyByUserId(input.userId, limit, input.cursor ?? null);
  }
}
