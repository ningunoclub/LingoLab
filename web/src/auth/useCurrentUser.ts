// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useQuery } from '@tanstack/react-query';
import { currentUserQuery } from './auth';

/** `user` is null when signed out, undefined while the first check is in flight. */
export function useCurrentUser() {
  const { data, isPending, isError } = useQuery(currentUserQuery);
  return { user: data ?? null, isPending, isError, isSignedIn: Boolean(data) };
}
