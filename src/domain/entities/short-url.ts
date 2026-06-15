export type ShortUrl = {
  id: string;
  originalUrl: string;
  shortcode: string;
  userId: string | null;
  customAlias: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};
