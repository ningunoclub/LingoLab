// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { requestPasswordReset, resetPassword } from './passwordResetApi';

const FORGOT_URL = 'http://localhost/api/v1/users/forgot-password';
const RESET_URL = 'http://localhost/api/v1/users/reset-password';

describe('requestPasswordReset', () => {
  it('resolves when the backend accepts the request', async () => {
    server.use(
      http.post(FORGOT_URL, () => HttpResponse.json({ message: 'Password reset email sent' })),
    );

    await expect(requestPasswordReset('teacher@school.ch')).resolves.toBeUndefined();
  });

  it('sends just the email address', async () => {
    let received: unknown;
    server.use(
      http.post(FORGOT_URL, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ message: 'Password reset email sent' });
      }),
    );

    await requestPasswordReset('teacher@school.ch');
    expect(received).toEqual({ email: 'teacher@school.ch' });
  });

  it('cannot distinguish an unknown address from a known one', async () => {
    // The backend answers 200 whatever it finds, so there is no "not found" to surface.
    // This pins the anti-enumeration contract: if it ever regresses to a 404, the failure
    // shows up here rather than as a quiet information leak in the UI.
    server.use(
      http.post(FORGOT_URL, () => HttpResponse.json({ message: 'Password reset email sent' })),
    );

    await expect(requestPasswordReset('nobody@nowhere.example')).resolves.toBeUndefined();
  });

  it('rejects on a transport-level failure so the caller can say "we could not ask"', async () => {
    server.use(http.post(FORGOT_URL, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })));

    await expect(requestPasswordReset('teacher@school.ch')).rejects.toThrow();
  });
});

describe('resetPassword', () => {
  const INPUT = { password: 'a-new-password', token: 'deadbeef' };

  it('reports success on 200', async () => {
    server.use(
      http.post(RESET_URL, () => HttpResponse.json({ message: 'Password updated successfully' })),
    );

    await expect(resetPassword(INPUT)).resolves.toEqual({ kind: 'reset' });
  });

  it('sends the password together with the token', async () => {
    // The legacy page never managed this: it bound the token to a variable named `string`
    // and sent `token: undefined`, so every reset failed. See SetPasswordCard.
    let received: unknown;
    server.use(
      http.post(RESET_URL, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ message: 'Password updated successfully' });
      }),
    );

    await resetPassword(INPUT);
    expect(received).toEqual({ password: 'a-new-password', token: 'deadbeef' });
  });

  it('reports an invalid or expired token on 400', async () => {
    server.use(
      http.post(RESET_URL, () => HttpResponse.json({ detail: 'Invalid token' }, { status: 400 })),
    );

    await expect(resetPassword(INPUT)).resolves.toEqual({ kind: 'invalid-token' });
  });

  it('reports anything else as a generic error', async () => {
    server.use(http.post(RESET_URL, () => HttpResponse.json({ detail: 'nope' }, { status: 422 })));

    await expect(resetPassword(INPUT)).resolves.toEqual({ kind: 'error', status: 422 });
  });
});
