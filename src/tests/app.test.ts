import { describe, expect, it } from '@jest/globals';
import { createApp } from '@/application/app';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = createApp();

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
