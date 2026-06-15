export type AccessLog = {
  shortcode: string;
  accessedAt: Date;
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
};
