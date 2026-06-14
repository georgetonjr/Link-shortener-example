import { describe, expect, it } from '@jest/globals';
import { createTestApp } from '@/tests/helpers/create-test-app';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const { app } = createTestApp();

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
