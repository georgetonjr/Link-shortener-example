export type AccessLogRecord = {
  shortcode: string;
  accessed_at: Date;
  id: string;
  referrer: string | null;
  user_agent: string | null;
  ip: string | null;
};
