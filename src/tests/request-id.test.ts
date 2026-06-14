import { describe, expect, it } from '@jest/globals';
import { createApp } from '@/application/app';

describe('requestId middleware', () => {
  it('generates a requestId and returns it in the response header', async () => {
    const app = createApp();

    const response = await app.request('/health');

    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('propagates an incoming x-request-id header', async () => {
    const app = createApp();
    const incomingId = 'test-request-id-123';

    const response = await app.request('/health', {
      headers: { 'x-request-id': incomingId },
    });

    expect(response.headers.get('x-request-id')).toBe(incomingId);
  });
});
