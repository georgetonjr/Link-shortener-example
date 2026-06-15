import { describe, expect, it } from '@jest/globals';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { createTestApp } from '@/tests/helpers/create-test-app';

describe('GET /docs/openapi.json', () => {
  it('returns a valid OpenAPI document describing the API', async () => {
    const { app } = createTestApp();

    const response = await app.request('/docs/openapi.json');

    expect(response.status).toBe(200);

    const document = (await response.json()) as OpenAPIObject;

    expect(document.openapi).toBe('3.0.0');
    expect(document.info.title).toBe('Link Shortener API');

    expect(document.paths).toHaveProperty('/auth/signup');
    expect(document.paths).toHaveProperty('/auth/login');
    expect(document.paths).toHaveProperty('/urls');
    expect(document.paths).toHaveProperty('/urls/{shortcode}');
    expect(document.paths).toHaveProperty('/urls/{shortcode}/stats');
    expect(document.paths).toHaveProperty('/{shortcode}');

    expect(document.paths['/urls']?.post?.requestBody).toBeDefined();
    expect(document.paths['/urls/{shortcode}']?.patch?.security).toEqual([{ BearerAuth: [] }]);
    expect(document.components?.securitySchemes?.BearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });
});

describe('GET /docs', () => {
  it('serves the Swagger UI', async () => {
    const { app } = createTestApp();

    const response = await app.request('/docs');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const html = await response.text();
    expect(html).toContain('swagger-ui');
  });
});
