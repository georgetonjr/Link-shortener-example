import { describe, expect, it } from '@jest/globals';
import { createTestApp } from '@/tests/helpers/create-test-app';

describe('requestId middleware', () => {
  it('generates a requestId and returns it in the response header', async () => {
    const { app } = createTestApp();

    const response = await app.request('/health');

    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('propagates an incoming x-request-id header', async () => {
    const { app } = createTestApp();
    const incomingId = 'test-request-id-123';

    const response = await app.request('/health', {
      headers: { 'x-request-id': incomingId },
    });

    expect(response.headers.get('x-request-id')).toBe(incomingId);
  });
});
