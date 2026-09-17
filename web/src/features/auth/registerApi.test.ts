// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { registerUser } from './registerApi';

const CREATE_URL = 'http://localhost/api/v1/users/create';

const INPUT = {
  email: 'teacher@school.ch',
  username: 'teacher',
  password: 'a-good-password',
};

describe('registerUser', () => {
  it('reports a created account on 200', async () => {
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json({ id: 'uuid', email: INPUT.email, verified: false }),
      ),
    );

    await expect(registerUser(INPUT)).resolves.toEqual({ kind: 'created' });
  });

  it('sends the single password the backend expects, not the confirmation pair', async () => {
    let received: unknown;
    server.use(
      http.post(CREATE_URL, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ id: 'uuid', email: INPUT.email, verified: false });
      }),
    );

    await registerUser(INPUT);
    expect(received).toEqual({
      email: 'teacher@school.ch',
      username: 'teacher',
      password: 'a-good-password',
    });
  });

  it('reports a duplicate on 409', async () => {
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json({ detail: 'User already exists' }, { status: 409 }),
      ),
    );

    await expect(registerUser(INPUT)).resolves.toEqual({ kind: 'already-exists' });
  });

  it('reports a rejected email on 400', async () => {
    server.use(
      http.post(CREATE_URL, () => HttpResponse.json({ detail: 'bad email' }, { status: 400 })),
    );

    await expect(registerUser(INPUT)).resolves.toEqual({ kind: 'invalid-email' });
  });

  // Legacy lumps 423 (registration_disabled) into its generic error branch; kept for parity.
  it('falls back to the generic error for 423, carrying the status', async () => {
    server.use(http.post(CREATE_URL, () => new HttpResponse(null, { status: 423 })));

    await expect(registerUser(INPUT)).resolves.toEqual({ kind: 'error', status: 423 });
  });

  it('falls back to the generic error for a server fault', async () => {
    server.use(http.post(CREATE_URL, () => new HttpResponse(null, { status: 500 })));

    await expect(registerUser(INPUT)).resolves.toEqual({ kind: 'error', status: 500 });
  });
});
