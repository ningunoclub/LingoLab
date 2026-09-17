// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { fetchClient } from '@/api/client';
import { WrongPasswordError } from './settingsApi';

/**
 * Every mutating endpoint on this page takes the current password in the body and
 * answers 401 `{detail:"Invalid"}` when it is wrong. `WrongPasswordError` is reused from
 * `settingsApi` so both settings pages report a bad password the same way.
 */
function assertPasswordAccepted(response: Response): void {
  if (response.status === 401) {
    throw new WrongPasswordError();
  }
}

/** One registered security key. The backend exposes only its numeric id. */
export type SecurityKey = { id: number };

export async function fetchSecurityKeys(): Promise<SecurityKey[]> {
  const { data, response } = await fetchClient.GET('/api/v1/users/webauthn/list');
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(`Loading security keys failed with status ${response.status}`);
  }
  return data
    .map((entry) => (entry as Record<string, unknown>).id)
    .filter((id): id is number => typeof id === 'number')
    .map((id) => ({ id }));
}

export async function fetchTotpActivated(): Promise<boolean> {
  const { data, response } = await fetchClient.GET('/api/v1/users/2fa/totp');
  if (!response.ok || !data) {
    throw new Error(`Loading the TOTP status failed with status ${response.status}`);
  }
  return (data as Record<string, unknown>).activated === true;
}

/** The provisioning URL and shared secret shown once, right after enabling TOTP. */
export type TotpSetupData = { url: string; secret: string };

export async function enableTotp(password: string): Promise<TotpSetupData> {
  const { data, response } = await fetchClient.POST('/api/v1/users/2fa/totp', {
    body: { password },
  });
  assertPasswordAccepted(response);
  if (!response.ok || !data) {
    throw new Error(`Enabling TOTP failed with status ${response.status}`);
  }
  const raw = data as Record<string, unknown>;
  return {
    url: typeof raw.url === 'string' ? raw.url : '',
    secret: typeof raw.secret === 'string' ? raw.secret : '',
  };
}

export async function disableTotp(password: string): Promise<void> {
  const { response } = await fetchClient.DELETE('/api/v1/users/2fa/totp', {
    body: { password },
  });
  assertPasswordAccepted(response);
  if (!response.ok) {
    throw new Error(`Disabling TOTP failed with status ${response.status}`);
  }
}

/**
 * Generating a backup code *replaces* the previous one server-side, so the caller
 * confirms first. The code is returned once and never again.
 */
export async function createBackupCode(password: string): Promise<string> {
  const { data, response } = await fetchClient.POST('/api/v1/users/2fa/backup_code', {
    body: { password },
  });
  assertPasswordAccepted(response);
  if (!response.ok || !data) {
    throw new Error(`Creating a backup code failed with status ${response.status}`);
  }
  const code = (data as Record<string, unknown>).code;
  if (typeof code !== 'string' || code === '') {
    throw new Error('The backup code was missing from the response');
  }
  return code;
}

/**
 * Whether logging in should require the password in addition to a second factor.
 *
 * Returns the value the server actually stored rather than the one that was requested.
 * Legacy read this field off the response without checking the status, so a 401 body
 * (`{detail:"Invalid"}`) set the switch to `undefined`; see "Legacy quirks" in the PR.
 */
export async function setRequirePassword(params: {
  requirePassword: boolean;
  password: string;
}): Promise<boolean> {
  const { data, response } = await fetchClient.POST('/api/v1/users/2fa/require_password', {
    body: { require_password: params.requirePassword, password: params.password },
  });
  assertPasswordAccepted(response);
  if (!response.ok || !data) {
    throw new Error(`Saving the setting failed with status ${response.status}`);
  }
  return (data as Record<string, unknown>).require_password === true;
}

/**
 * Step one of the registration ceremony: the backend stores a challenge in Redis
 * (ten-minute TTL) and returns the creation options.
 *
 * Legacy then forced `authenticatorAttachment` to `'cross-platform'`, overriding the
 * backend, which limits enrolment to roaming keys and excludes platform authenticators
 * such as Touch ID. Kept, because changing it would change which devices can enrol.
 *
 * Legacy also tried to strip `transports` from each excluded credential, but its loop
 * `for (let i = 0; i++; i < ...)` has the condition and update swapped and never runs.
 * The backend already sends `transports: []`, so dropping it changes nothing.
 */
export async function beginKeyRegistration(
  password: string,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { data, response } = await fetchClient.POST('/api/v1/users/webauthn/add_key_init', {
    body: { password },
  });
  assertPasswordAccepted(response);
  if (!response.ok || !data) {
    throw new Error(`Starting key registration failed with status ${response.status}`);
  }
  const options = data as unknown as PublicKeyCredentialCreationOptionsJSON;
  return {
    ...options,
    authenticatorSelection: {
      ...options.authenticatorSelection,
      authenticatorAttachment: 'cross-platform',
    },
  };
}

/** Step two: hand the attestation back so the backend can verify and store the key. */
export async function finishKeyRegistration(credential: RegistrationResponseJSON): Promise<void> {
  const { response } = await fetchClient.POST('/api/v1/users/webauthn/add_key', {
    // The generated schema models this as the backend's RegistrationCredential, whose
    // field names match the JSON the browser produces.
    body: credential as unknown as Record<string, never>,
  });
  if (!response.ok) {
    throw new Error(`Registering the security key failed with status ${response.status}`);
  }
}

export async function deleteSecurityKey(params: {
  keyId: number;
  password: string;
}): Promise<void> {
  const { response } = await fetchClient.DELETE('/api/v1/users/webauthn/key/{key_id}', {
    params: { path: { key_id: params.keyId } },
    body: { password: params.password },
  });
  assertPasswordAccepted(response);
  if (response.status === 404) {
    throw new Error('The security key no longer exists');
  }
  if (!response.ok) {
    throw new Error(`Removing the security key failed with status ${response.status}`);
  }
}

/**
 * Whether the account currently requires the password alongside a second factor.
 *
 * `require_password` is not part of the narrowed `SettingsUser`, so it is read straight
 * off `/users/me` rather than widening that type for one boolean.
 */
export async function fetchRequirePassword(): Promise<boolean> {
  const { data, response } = await fetchClient.GET('/api/v1/users/me');
  if (!response.ok || !data) {
    throw new Error(`Loading the account failed with status ${response.status}`);
  }
  return (data as Record<string, unknown>).require_password === true;
}

export const securityQueries = {
  keys: { queryKey: ['settings', 'securityKeys'] as const, queryFn: fetchSecurityKeys },
  totp: { queryKey: ['settings', 'totp'] as const, queryFn: fetchTotpActivated },
  requirePassword: {
    queryKey: ['settings', 'requirePassword'] as const,
    queryFn: fetchRequirePassword,
  },
};
