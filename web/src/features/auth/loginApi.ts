// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fetchClient } from '@/api/client';

/**
 * Auth methods the backend can offer, mirroring `StartLoginResponseTypes`
 * in classquiz/routers/login.py.
 */
export const AUTH_METHODS = ['PASSWORD', 'PASSKEY', 'TOTP', 'BACKUP'] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

/**
 * Answer to POST /login/start.
 *
 * `step_1` / `step_2` are Python *sets* on the backend, so the order of the
 * serialised arrays is not stable. Never rely on it.
 */
export type LoginSession = {
  session_id: string;
  step_1: AuthMethod[];
  step_2: AuthMethod[];
  /** Serialised WebAuthn options, only present when the user has a passkey. */
  webauthn_data: string | null;
};

function isAuthMethod(value: unknown): value is AuthMethod {
  return typeof value === 'string' && (AUTH_METHODS as readonly string[]).includes(value);
}

function toMethods(value: unknown): AuthMethod[] {
  return Array.isArray(value) ? value.filter(isAuthMethod) : [];
}

/**
 * Step 0: identify the user.
 *
 * The backend deliberately answers for unknown *and* unverified accounts with a
 * throwaway session offering PASSWORD, so that the response cannot be used to probe
 * which accounts exist. The UI must therefore treat every answer identically and only
 * ever report a failure at the password step.
 */
export async function startLogin(email: string): Promise<LoginSession> {
  const { data, response } = await fetchClient.POST('/api/v1/login/start', {
    body: { email },
  });
  if (!response.ok || !data) {
    throw new Error(`Login start failed with status ${response.status}`);
  }
  const raw = data as Record<string, unknown>;
  return {
    session_id: String(raw.session_id ?? ''),
    step_1: toMethods(raw.step_1),
    step_2: toMethods(raw.step_2),
    webauthn_data: typeof raw.webauthn_data === 'string' ? raw.webauthn_data : null,
  };
}

/** What the backend's status code means for a completed challenge. */
export type StepOutcome =
  /** 200: fully signed in, the cookie is set. */
  | { kind: 'signed-in' }
  /** 202: this factor passed, a second one is required. */
  | { kind: 'need-second-factor' };

/** Raised when the backend rejects the credentials (401). */
export class WrongCredentialsError extends Error {
  constructor() {
    super('wrong credentials');
    this.name = 'WrongCredentialsError';
  }
}

/**
 * Submit one authentication factor.
 *
 * The response body is empty on both success paths, so the status code carries all the
 * meaning: 200 signed in, 202 one more factor needed, 401 rejected.
 */
export async function submitLoginStep(params: {
  sessionId: string;
  step: 1 | 2;
  authType: AuthMethod;
  data: string;
}): Promise<StepOutcome> {
  const { response } = await fetchClient.POST('/api/v1/login/step/{step_id}', {
    params: {
      path: { step_id: params.step },
      query: { session_id: params.sessionId },
    },
    body: { auth_type: params.authType, data: params.data },
  });

  if (response.status === 200) return { kind: 'signed-in' };
  if (response.status === 202) return { kind: 'need-second-factor' };
  if (response.status === 401) throw new WrongCredentialsError();
  throw new Error(`Login step failed with status ${response.status}`);
}
