export type ShortUrlRecord = {
  id: string;
  original_url: string;
  shortcode: string;
  user_id: string | null;
  custom_alias: string | null;
  expires_at: Date | null;
  created_at: Date;
};
