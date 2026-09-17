// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import {
  changePassword,
  createApiKey,
  deleteApiKey,
  deleteSession,
  fetchApiKeys,
  fetchCurrentSession,
  fetchSessions,
  fetchSettingsUser,
  WrongPasswordError,
} from './settingsApi';

const BASE = 'http://localhost/api/v1/users';

const SESSION_PAYLOAD = {
  id: 'session-1',
  session_key: 'super-secret-session-key',
  created_at: '2026-09-01T10:00:00',
  last_seen: '2026-09-17T13:00:00',
  user_agent: 'Mozilla/5.0 (Macintosh) Chrome/140.0.0.0',
  ip_address: '203.0.113.4',
};

describe('fetchSettingsUser', () => {
  it('narrows the wide User payload to what the page renders', async () => {
    server.use(
      http.get(`${BASE}/me`, () =>
        HttpResponse.json({
          id: 'user-1',
          email: 'teacher@school.ch',
          username: 'teacher',
          verified: true,
          created_at: '2026-01-01T00:00:00',
          password: 'should-not-matter',
        }),
      ),
    );

    await expect(fetchSettingsUser()).resolves.toEqual({
      id: 'user-1',
      email: 'teacher@school.ch',
      username: 'teacher',
      verified: true,
      created_at: '2026-01-01T00:00:00',
    });
  });

  it('throws when the account cannot be loaded', async () => {
    server.use(http.get(`${BASE}/me`, () => new HttpResponse(null, { status: 401 })));
    await expect(fetchSettingsUser()).rejects.toThrow();
  });
});

describe('fetchSessions', () => {
  it('maps the fields the table shows', async () => {
    server.use(http.get(`${BASE}/sessions/list`, () => HttpResponse.json([SESSION_PAYLOAD])));

    await expect(fetchSessions()).resolves.toEqual([
      {
        id: 'session-1',
        created_at: '2026-09-01T10:00:00',
        last_seen: '2026-09-17T13:00:00',
        user_agent: 'Mozilla/5.0 (Macintosh) Chrome/140.0.0.0',
      },
    ]);
  });

  /**
   * session_key is a live credential. It must not survive into component state, where it
   * could reach the DOM, a screenshot or a React devtools dump.
   */
  it('never carries session_key out of the API layer', async () => {
    server.use(http.get(`${BASE}/sessions/list`, () => HttpResponse.json([SESSION_PAYLOAD])));

    const sessions = await fetchSessions();
    expect(JSON.stringify(sessions)).not.toContain('super-secret-session-key');
    expect(sessions[0]).not.toHaveProperty('session_key');
    expect(sessions[0]).not.toHaveProperty('ip_address');
  });
});

describe('fetchCurrentSession', () => {
  it('returns null instead of throwing, so a failure cannot blank the table', async () => {
    server.use(http.get(`${BASE}/session`, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchCurrentSession()).resolves.toBeNull();
  });
});

describe('deleteSession', () => {
  it('addresses the session by id', async () => {
    let seen: string | null = null;
    server.use(
      http.delete(`${BASE}/sessions/:id`, ({ params }) => {
        seen = String(params.id);
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await deleteSession('session-1');
    expect(seen).toBe('session-1');
  });
});

describe('api keys', () => {
  it('flattens the {key} objects the backend returns', async () => {
    server.use(
      http.get(`${BASE}/api_keys`, () => HttpResponse.json([{ key: 'key-one' }, { key: 'key-2' }])),
    );
    await expect(fetchApiKeys()).resolves.toEqual(['key-one', 'key-2']);
  });

  it('drops malformed entries rather than rendering blanks', async () => {
    server.use(
      http.get(`${BASE}/api_keys`, () => HttpResponse.json([{ key: 'ok' }, {}, { key: '' }])),
    );
    await expect(fetchApiKeys()).resolves.toEqual(['ok']);
  });

  it('creates a key', async () => {
    let called = false;
    server.use(
      http.post(`${BASE}/api_keys`, () => {
        called = true;
        return HttpResponse.json({ key: 'new' });
      }),
    );
    await createApiKey();
    expect(called).toBe(true);
  });

  it('passes the key to delete as a query parameter', async () => {
    let seen: string | null = null;
    server.use(
      http.delete(`${BASE}/api_keys`, ({ request }) => {
        seen = new URL(request.url).searchParams.get('api_key');
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await deleteApiKey('key-one');
    expect(seen).toBe('key-one');
  });
});

describe('changePassword', () => {
  it('sends the snake_case body the backend expects', async () => {
    let body: unknown;
    server.use(
      http.put(`${BASE}/password/update`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await changePassword({ oldPassword: 'old-one', newPassword: 'new-one' });
    expect(body).toEqual({ old_password: 'old-one', new_password: 'new-one' });
  });

  it.each([401, 400])('reports a rejected password (%i) as WrongPasswordError', async (status) => {
    server.use(http.put(`${BASE}/password/update`, () => new HttpResponse(null, { status })));
    await expect(changePassword({ oldPassword: 'x', newPassword: 'y' })).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });

  it('reports other failures as a generic error', async () => {
    server.use(http.put(`${BASE}/password/update`, () => new HttpResponse(null, { status: 500 })));
    const failure = changePassword({ oldPassword: 'x', newPassword: 'y' });
    await expect(failure).rejects.toThrow();
    await expect(failure).rejects.not.toBeInstanceOf(WrongPasswordError);
  });
});
