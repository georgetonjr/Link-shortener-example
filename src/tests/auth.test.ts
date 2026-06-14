import { describe, expect, it, jest } from '@jest/globals';
import { createTestApp } from '@/tests/helpers/create-test-app';
import type { CassandraClient } from '@/infra/cassandra/client';

type SignupResponseBody = { id: string; email: string; createdAt: string };
type ErrorResponseBody = { error: string; message: string; requestId: string };

describe('POST /auth/signup', () => {
  it('creates a user and returns 201', async () => {
    const execute = jest
      .fn<CassandraClient['execute']>()
      // findByEmail (signup): nenhum usuário existente
      .mockResolvedValueOnce([])
      // create: retorna o registro criado
      .mockResolvedValueOnce([]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'secret123' }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as SignupResponseBody;
    expect(body.email).toBe('user@example.com');
    expect(body.id).toBeTruthy();
  });

  it('returns 400 for invalid payload', async () => {
    const { app } = createTestApp();

    const response = await app.request('/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '123' }),
    });

    expect(response.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValueOnce([
      {
        id: 'existing-id',
        email: 'user@example.com',
        password_hash: 'hash',
        created_at: new Date(),
      },
    ]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'secret123' }),
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('CONFLICT');
    expect(body.requestId).toBeTruthy();
  });
});

describe('POST /auth/login', () => {
  it('returns 401 for unknown user', async () => {
    const execute = jest.fn<CassandraClient['execute']>().mockResolvedValueOnce([]);

    const { app } = createTestApp({ execute });

    const response = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'secret123' }),
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error).toBe('UNAUTHORIZED');
  });
});
