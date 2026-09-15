// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { fetchCurrentUser } from './auth';

const CHECK_URL = 'http://localhost/api/v1/users/check';

describe('fetchCurrentUser', () => {
  it('returns the user when the cookie is valid', async () => {
    server.use(http.get(CHECK_URL, () => HttpResponse.json({ email: 'teacher@school.ch' })));
    await expect(fetchCurrentUser()).resolves.toEqual({ email: 'teacher@school.ch' });
  });

  it('returns null when signed out (401)', async () => {
    server.use(http.get(CHECK_URL, () => new HttpResponse(null, { status: 401 })));
    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  it('returns null on 403', async () => {
    server.use(http.get(CHECK_URL, () => new HttpResponse(null, { status: 403 })));
    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  it('throws on a server error, so Query can surface an error state', async () => {
    server.use(http.get(CHECK_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchCurrentUser()).rejects.toThrow(/500/);
  });

  it('returns null when the payload is not shaped like a user', async () => {
    server.use(http.get(CHECK_URL, () => HttpResponse.json({ unexpected: true })));
    await expect(fetchCurrentUser()).resolves.toBeNull();
  });
});
