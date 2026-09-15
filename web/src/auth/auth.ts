// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { fetchClient } from '@/api/client';

/**
 * The signed-in user. The backend's /users/check has no response schema in the
 * OpenAPI spec (it returns a bare dict), so the shape is declared here and
 * validated at runtime rather than trusted from generated types.
 */
export type CurrentUser = { email: string };

function isCurrentUser(value: unknown): value is CurrentUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'email' in value &&
    typeof (value as { email: unknown }).email === 'string'
  );
}

/**
 * Resolves the current user from the httpOnly cookie.
 * Returns null when signed out (the endpoint answers 401), and refreshes the cookie
 * as a side effect when signed in.
 */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data, response } = await fetchClient.GET('/api/v1/users/check');
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Auth check failed with status ${response.status}`);
  return isCurrentUser(data) ? data : null;
}

export const currentUserQuery = {
  queryKey: ['currentUser'] as const,
  queryFn: fetchCurrentUser,
  // The cookie is short-lived; don't serve a stale identity across navigations.
  staleTime: 30_000,
  retry: false,
};

/**
 * Route guard. Mirrors the legacy `+page.server.ts` redirect-when-logged-out behaviour:
 * unauthenticated users land on the login page with a returnTo pointing back here.
 */
export async function requireAuth(queryClient: QueryClient, href: string): Promise<CurrentUser> {
  const user = await queryClient.ensureQueryData(currentUserQuery);
  if (!user) {
    throw redirect({ to: '/account/login', search: { returnTo: href } });
  }
  return user;
}

/** Clears the session server-side, then drops every cached query. */
export async function logout(queryClient: QueryClient): Promise<void> {
  await fetchClient.GET('/api/v1/users/logout');
  queryClient.clear();
}
