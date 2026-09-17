// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fetchClient } from '@/api/client';

/**
 * Ask the backend to mail a reset link.
 *
 * Deliberately returns nothing. `forgotten_password` filters on `verified=True` and then
 * answers `{"message": "Password reset email sent"}` *whatever* it found - an unknown
 * address, an unverified one and a real one are indistinguishable from the client. That
 * is anti-enumeration, the same posture as `/login/start`'s fake session, so the UI has
 * no outcome to branch on and must not imply one.
 *
 * Legacy's `else if (res.status === 404) alert('user not found!')` was therefore dead
 * code for a branch the backend cannot produce. It is not ported: see MIGRATION.md.
 *
 * Transport failures still reject, so the caller can tell "we could not ask" from
 * "we asked and say nothing".
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { response } = await fetchClient.POST('/api/v1/users/forgot-password', {
    body: { email },
  });

  if (!response.ok) {
    throw new Error(`forgot-password failed with ${response.status}`);
  }
}

/**
 * What the backend's status code means when redeeming a reset token.
 *
 * `reset_password_with_token` looks the token up in redis (`reset_passwd:<token>`, 1-hour
 * TTL, single use). A missing key and a token whose user has since been deleted both come
 * back as the same 400 "Invalid token", so the UI cannot tell expired from forged - and
 * says "invalid or expired" rather than guessing.
 */
export type ResetPasswordOutcome =
  /** 200: password changed. The backend also cleared the auth cookies and signed every session out. */
  | { kind: 'reset' }
  /** 400: token unknown, already used, or older than an hour. */
  | { kind: 'invalid-token' }
  /** Anything else, including 422 from a malformed body. */
  | { kind: 'error'; status: number };

export type ResetPasswordInput = {
  password: string;
  token: string;
};

/**
 * Set a new password using the token from the reset mail.
 *
 * Never throws for an expected rejection; every branch the UI has copy for comes back as
 * an outcome, matching `registerUser`.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<ResetPasswordOutcome> {
  const { response } = await fetchClient.POST('/api/v1/users/reset-password', {
    body: { password: input.password, token: input.token },
  });

  if (response.status === 200) return { kind: 'reset' };
  if (response.status === 400) return { kind: 'invalid-token' };
  return { kind: 'error', status: response.status };
}
