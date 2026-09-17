// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { startLogin, submitLoginStep, WrongCredentialsError } from './loginApi';

const START_URL = 'http://localhost/api/v1/login/start';
const STEP_URL = 'http://localhost/api/v1/login/step/:stepId';

describe('startLogin', () => {
  it('returns the offered methods and the session id', async () => {
    server.use(
      http.post(START_URL, () =>
        HttpResponse.json({
          session_id: 'abc123',
          step_1: ['PASSWORD', 'PASSKEY'],
          step_2: ['TOTP'],
          webauthn_data: '{"challenge":"x"}',
        }),
      ),
    );

    await expect(startLogin('teacher@school.ch')).resolves.toEqual({
      session_id: 'abc123',
      step_1: ['PASSWORD', 'PASSKEY'],
      step_2: ['TOTP'],
      webauthn_data: '{"challenge":"x"}',
    });
  });

  it('sends the identifier the user typed', async () => {
    let received: unknown;
    server.use(
      http.post(START_URL, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ session_id: 's', step_1: [], step_2: [], webauthn_data: null });
      }),
    );

    await startLogin('a-username');
    expect(received).toEqual({ email: 'a-username' });
  });

  it('drops method values it does not recognise instead of trusting the payload', async () => {
    server.use(
      http.post(START_URL, () =>
        HttpResponse.json({
          session_id: 's',
          step_1: ['PASSWORD', 'SOMETHING_NEW'],
          step_2: null,
          webauthn_data: null,
        }),
      ),
    );

    const session = await startLogin('teacher@school.ch');
    expect(session.step_1).toEqual(['PASSWORD']);
    expect(session.step_2).toEqual([]);
  });

  it('throws when the backend errors', async () => {
    server.use(http.post(START_URL, () => new HttpResponse(null, { status: 500 })));
    await expect(startLogin('teacher@school.ch')).rejects.toThrow(/500/);
  });
});

describe('submitLoginStep', () => {
  const submit = () =>
    submitLoginStep({ sessionId: 's1', step: 1, authType: 'PASSWORD', data: 'hunter2' });

  it('reports a completed login on 200', async () => {
    server.use(http.post(STEP_URL, () => new HttpResponse(null, { status: 200 })));
    await expect(submit()).resolves.toEqual({ kind: 'signed-in' });
  });

  it('reports that a second factor is required on 202', async () => {
    server.use(http.post(STEP_URL, () => new HttpResponse(null, { status: 202 })));
    await expect(submit()).resolves.toEqual({ kind: 'need-second-factor' });
  });

  it('raises WrongCredentialsError on 401', async () => {
    server.use(
      http.post(STEP_URL, () =>
        HttpResponse.json({ detail: 'wrong credentials' }, { status: 401 }),
      ),
    );
    await expect(submit()).rejects.toBeInstanceOf(WrongCredentialsError);
  });

  it('passes the session id as a query parameter and the factor in the body', async () => {
    let url: URL | undefined;
    let body: unknown;
    server.use(
      http.post(STEP_URL, async ({ request }) => {
        url = new URL(request.url);
        body = await request.json();
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await submitLoginStep({ sessionId: 'sess-9', step: 2, authType: 'PASSWORD', data: 'pw' });

    expect(url?.pathname).toBe('/api/v1/login/step/2');
    expect(url?.searchParams.get('session_id')).toBe('sess-9');
    expect(body).toEqual({ auth_type: 'PASSWORD', data: 'pw' });
  });
});
