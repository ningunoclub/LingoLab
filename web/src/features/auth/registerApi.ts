// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fetchClient } from '@/api/client';

/**
 * What the backend's status code means for a registration attempt.
 *
 * `create_user` in classquiz/routers/users/__init__.py answers with a bare status code
 * plus an unstructured `detail` string, so the code carries all the meaning we act on.
 */
export type RegisterOutcome =
  /** 200: the account exists; a verification mail is on its way (unless the server skips it). */
  | { kind: 'created' }
  /** 409: email *or* username already taken - the backend does not say which. */
  | { kind: 'already-exists' }
  /** 400: `validate_email` rejected the address, or the username was exactly 32 characters. */
  | { kind: 'invalid-email' }
  /**
   * Anything else, including 423 (`registration_disabled`) and 422.
   *
   * Legacy lumps 423 into its generic error branch, so we do too - see "Legacy quirks"
   * in MIGRATION.md. Worth splitting out once self-hosting docs exist, because an admin
   * turning registration off is a state this deployment target will actually reach.
   */
  | { kind: 'error'; status: number };

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

/**
 * Create an account.
 *
 * Never throws for an expected rejection: every branch the UI has copy for comes back as
 * a `RegisterOutcome`, so the caller renders a modal instead of catching. Note that the
 * 200 body (id/verified/email) is deliberately ignored - the user is not signed in yet
 * and must confirm their email address first.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterOutcome> {
  const { response } = await fetchClient.POST('/api/v1/users/create', {
    body: {
      email: input.email,
      username: input.username,
      password: input.password,
    },
  });

  if (response.status === 200) return { kind: 'created' };
  if (response.status === 409) return { kind: 'already-exists' };
  if (response.status === 400) return { kind: 'invalid-email' };
  return { kind: 'error', status: response.status };
}
