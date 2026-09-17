// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fetchClient } from '@/api/client';

/**
 * The signed-in user as /users/me returns it.
 *
 * The generated `User` schema is wider than this (it carries relations and internal
 * fields), so the page declares what it actually renders and narrows at runtime.
 */
export type SettingsUser = {
  id: string;
  email: string;
  username: string;
  verified: boolean;
  created_at: string | null;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function fetchSettingsUser(): Promise<SettingsUser> {
  const { data, response } = await fetchClient.GET('/api/v1/users/me');
  if (!response.ok || !data) {
    throw new Error(`Loading the account failed with status ${response.status}`);
  }
  const raw = data as Record<string, unknown>;
  return {
    id: asString(raw.id),
    email: asString(raw.email),
    username: asString(raw.username),
    verified: raw.verified === true,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
  };
}

/** One signed-in device, as shown in the session table. */
export type UserSession = {
  id: string;
  created_at: string | null;
  last_seen: string | null;
  user_agent: string | null;
};

/**
 * The backend's UserSession also carries `session_key`, which is a live credential.
 * It is deliberately dropped here so it cannot reach the DOM, a log or a screenshot.
 */
function toSession(raw: Record<string, unknown>): UserSession {
  return {
    id: asString(raw.id),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
    last_seen: typeof raw.last_seen === 'string' ? raw.last_seen : null,
    user_agent: typeof raw.user_agent === 'string' ? raw.user_agent : null,
  };
}

export async function fetchSessions(): Promise<UserSession[]> {
  const { data, response } = await fetchClient.GET('/api/v1/users/sessions/list');
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(`Loading sessions failed with status ${response.status}`);
  }
  return data.map((entry) => toSession(entry as Record<string, unknown>));
}

/**
 * The session this browser is using, so the table can mark it.
 *
 * Legacy calls this only when the list succeeds and ignores a failure. A failure here
 * must not blank the table, so the caller treats null as "cannot tell which is current".
 */
export async function fetchCurrentSession(): Promise<UserSession | null> {
  const { data, response } = await fetchClient.GET('/api/v1/users/session');
  if (!response.ok || !data) return null;
  return toSession(data as Record<string, unknown>);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { response } = await fetchClient.DELETE('/api/v1/users/sessions/{session_id}', {
    params: { path: { session_id: sessionId } },
  });
  if (!response.ok) {
    throw new Error(`Deleting the session failed with status ${response.status}`);
  }
}

export async function fetchApiKeys(): Promise<string[]> {
  const { data, response } = await fetchClient.GET('/api/v1/users/api_keys');
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(`Loading API keys failed with status ${response.status}`);
  }
  return data
    .map((entry) => asString((entry as Record<string, unknown>).key))
    .filter((key) => key !== '');
}

export async function createApiKey(): Promise<void> {
  const { response } = await fetchClient.POST('/api/v1/users/api_keys');
  if (!response.ok) {
    throw new Error(`Creating an API key failed with status ${response.status}`);
  }
}

export async function deleteApiKey(key: string): Promise<void> {
  const { response } = await fetchClient.DELETE('/api/v1/users/api_keys', {
    params: { query: { api_key: key } },
  });
  if (!response.ok) {
    throw new Error(`Deleting the API key failed with status ${response.status}`);
  }
}

/** Raised when the backend rejects the current password (401). */
export class WrongPasswordError extends Error {
  constructor() {
    super('wrong password');
    this.name = 'WrongPasswordError';
  }
}

/**
 * Changing the password invalidates every other session server-side, so the caller
 * signs the user out afterwards, exactly as legacy did.
 */
export async function changePassword(params: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> {
  const { response } = await fetchClient.PUT('/api/v1/users/password/update', {
    body: { old_password: params.oldPassword, new_password: params.newPassword },
  });
  if (response.status === 401 || response.status === 400) {
    throw new WrongPasswordError();
  }
  if (!response.ok) {
    throw new Error(`Changing the password failed with status ${response.status}`);
  }
}

export const settingsQueries = {
  user: { queryKey: ['settings', 'user'] as const, queryFn: fetchSettingsUser },
  sessions: { queryKey: ['settings', 'sessions'] as const, queryFn: fetchSessions },
  currentSession: {
    queryKey: ['settings', 'currentSession'] as const,
    queryFn: fetchCurrentSession,
  },
  apiKeys: { queryKey: ['settings', 'apiKeys'] as const, queryFn: fetchApiKeys },
};
