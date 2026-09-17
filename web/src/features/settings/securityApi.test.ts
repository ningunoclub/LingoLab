// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import {
  beginKeyRegistration,
  createBackupCode,
  deleteSecurityKey,
  disableTotp,
  enableTotp,
  fetchRequirePassword,
  fetchSecurityKeys,
  fetchTotpActivated,
  setRequirePassword,
} from './securityApi';
import { WrongPasswordError } from './settingsApi';

const BASE = 'http://localhost/api/v1/users';

/** The backend's 401 body for every wrong-password rejection on this page. */
const INVALID = () => HttpResponse.json({ detail: 'Invalid' }, { status: 401 });

describe('fetchSecurityKeys', () => {
  it('maps the ids the backend exposes', async () => {
    server.use(http.get(`${BASE}/webauthn/list`, () => HttpResponse.json([{ id: 1 }, { id: 7 }])));
    await expect(fetchSecurityKeys()).resolves.toEqual([{ id: 1 }, { id: 7 }]);
  });

  it('drops entries without a numeric id rather than rendering undefined', async () => {
    server.use(
      http.get(`${BASE}/webauthn/list`, () => HttpResponse.json([{ id: 1 }, { id: null }, {}])),
    );
    await expect(fetchSecurityKeys()).resolves.toEqual([{ id: 1 }]);
  });

  it('throws when the list cannot be loaded', async () => {
    server.use(http.get(`${BASE}/webauthn/list`, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchSecurityKeys()).rejects.toThrow();
  });
});

describe('fetchTotpActivated', () => {
  it('reads the activated flag', async () => {
    server.use(http.get(`${BASE}/2fa/totp`, () => HttpResponse.json({ activated: true })));
    await expect(fetchTotpActivated()).resolves.toBe(true);
  });

  it('treats anything but true as off', async () => {
    server.use(http.get(`${BASE}/2fa/totp`, () => HttpResponse.json({ activated: 'yes' })));
    await expect(fetchTotpActivated()).resolves.toBe(false);
  });
});

describe('enableTotp', () => {
  it('returns the provisioning url and secret', async () => {
    server.use(
      http.post(`${BASE}/2fa/totp`, () =>
        HttpResponse.json({ url: 'otpauth://totp/x', secret: 'ABC123' }),
      ),
    );
    await expect(enableTotp('pw')).resolves.toEqual({
      url: 'otpauth://totp/x',
      secret: 'ABC123',
    });
  });

  it('raises WrongPasswordError on 401', async () => {
    server.use(http.post(`${BASE}/2fa/totp`, INVALID));
    await expect(enableTotp('nope')).rejects.toBeInstanceOf(WrongPasswordError);
  });
});

describe('disableTotp', () => {
  it('resolves when the backend accepts', async () => {
    server.use(http.delete(`${BASE}/2fa/totp`, () => new HttpResponse(null, { status: 200 })));
    await expect(disableTotp('pw')).resolves.toBeUndefined();
  });

  it('raises WrongPasswordError on 401', async () => {
    server.use(http.delete(`${BASE}/2fa/totp`, INVALID));
    await expect(disableTotp('nope')).rejects.toBeInstanceOf(WrongPasswordError);
  });
});

describe('createBackupCode', () => {
  it('returns the generated code', async () => {
    server.use(http.post(`${BASE}/2fa/backup_code`, () => HttpResponse.json({ code: 'deadbeef' })));
    await expect(createBackupCode('pw')).resolves.toBe('deadbeef');
  });

  it('raises WrongPasswordError on 401', async () => {
    server.use(http.post(`${BASE}/2fa/backup_code`, INVALID));
    await expect(createBackupCode('nope')).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('throws when the code is missing from an otherwise OK response', async () => {
    server.use(http.post(`${BASE}/2fa/backup_code`, () => HttpResponse.json({ code: '' })));
    await expect(createBackupCode('pw')).rejects.toThrow();
  });
});

describe('setRequirePassword', () => {
  it('returns what the server stored, not what was requested', async () => {
    server.use(
      http.post(`${BASE}/2fa/require_password`, () =>
        // The server is the authority here; if it stored false, the switch shows false.
        HttpResponse.json({ require_password: false, password: 'pw' }),
      ),
    );
    await expect(setRequirePassword({ requirePassword: true, password: 'pw' })).resolves.toBe(
      false,
    );
  });

  it('raises WrongPasswordError on 401 instead of reading the error body', async () => {
    // Legacy read `.require_password` off this body and set the switch to undefined.
    server.use(http.post(`${BASE}/2fa/require_password`, INVALID));
    await expect(
      setRequirePassword({ requirePassword: true, password: 'nope' }),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });
});

describe('fetchRequirePassword', () => {
  it('reads the flag off /users/me', async () => {
    server.use(
      http.get(`${BASE}/me`, () =>
        HttpResponse.json({ id: 'u', email: 'a@b.ch', username: 'a', require_password: true }),
      ),
    );
    await expect(fetchRequirePassword()).resolves.toBe(true);
  });

  it('defaults to false when the field is absent', async () => {
    server.use(http.get(`${BASE}/me`, () => HttpResponse.json({ id: 'u' })));
    await expect(fetchRequirePassword()).resolves.toBe(false);
  });
});

describe('beginKeyRegistration', () => {
  const OPTIONS = {
    challenge: 'Y2hhbGxlbmdl',
    rp: { id: 'localhost', name: 'ClassQuiz' },
    user: { id: 'dXNlcg', name: 'teacher@school.ch', displayName: 'teacher' },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    excludeCredentials: [{ id: 'a2V5', type: 'public-key', transports: [] }],
    authenticatorSelection: { userVerification: 'preferred' },
  };

  it('forces cross-platform attachment, as legacy did', async () => {
    server.use(http.post(`${BASE}/webauthn/add_key_init`, () => HttpResponse.json(OPTIONS)));

    const options = await beginKeyRegistration('pw');
    expect(options.authenticatorSelection?.authenticatorAttachment).toBe('cross-platform');
    // The rest of the backend's options must survive untouched.
    expect(options.authenticatorSelection?.userVerification).toBe('preferred');
    expect(options.challenge).toBe('Y2hhbGxlbmdl');
    expect(options.excludeCredentials).toEqual(OPTIONS.excludeCredentials);
  });

  it('raises WrongPasswordError on 401', async () => {
    server.use(http.post(`${BASE}/webauthn/add_key_init`, INVALID));
    await expect(beginKeyRegistration('nope')).rejects.toBeInstanceOf(WrongPasswordError);
  });
});

describe('deleteSecurityKey', () => {
  it('sends the password in the body of the DELETE', async () => {
    let received: unknown;
    server.use(
      http.delete(`${BASE}/webauthn/key/:keyId`, async ({ request, params }) => {
        received = { body: await request.json(), keyId: params.keyId };
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await deleteSecurityKey({ keyId: 7, password: 'pw' });
    expect(received).toEqual({ body: { password: 'pw' }, keyId: '7' });
  });

  it('raises WrongPasswordError on 401', async () => {
    server.use(http.delete(`${BASE}/webauthn/key/:keyId`, INVALID));
    await expect(deleteSecurityKey({ keyId: 1, password: 'nope' })).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });

  it('reports a key that no longer exists', async () => {
    server.use(
      http.delete(`${BASE}/webauthn/key/:keyId`, () => new HttpResponse(null, { status: 404 })),
    );
    await expect(deleteSecurityKey({ keyId: 99, password: 'pw' })).rejects.toThrow(
      /no longer exists/,
    );
  });
});
