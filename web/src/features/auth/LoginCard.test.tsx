// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import en from '@/locales/en.json';
import { server } from '@/test/msw';
import { LoginCard } from './LoginCard';

const webauthn = vi.hoisted(() => ({
  startAuthentication: vi.fn(),
  browserSupportsWebAuthn: vi.fn(() => true),
}));

vi.mock('@simplewebauthn/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplewebauthn/browser')>()),
  ...webauthn,
}));

type StepRequest = { step: string; body: unknown };

/** Fakes /login/start and /login/step, recording every step request. */
function mockBackend(options: {
  step1: string[];
  step2?: string[];
  webauthnData?: string | null;
  respond: (req: StepRequest) => number;
}) {
  const requests: StepRequest[] = [];
  server.use(
    http.get('http://localhost/api/v1/users/check', () => new HttpResponse(null, { status: 401 })),
    http.post('http://localhost/api/v1/login/start', () =>
      HttpResponse.json({
        session_id: 'sess',
        step_1: options.step1,
        step_2: options.step2 ?? [],
        webauthn_data: options.webauthnData ?? null,
      }),
    ),
    http.post('http://localhost/api/v1/login/step/:step', async ({ request, params }) => {
      const req = { step: String(params.step), body: await request.json() };
      requests.push(req);
      return new HttpResponse(null, { status: options.respond(req) });
    }),
  );
  return requests;
}

async function renderCard() {
  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <LoginCard returnTo="/dashboard" verified={false} />,
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => <p>dashboard</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute, dashboardRoute]),
    // Memory history, so one test's navigation to /dashboard does not leak into the next.
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      {/* biome-ignore lint/suspicious/noExplicitAny: throwaway test router, not the app's tree */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(en.login_page.email_or_username), 'teacher');
  await user.click(screen.getByRole('button', { name: en.words.continue }));
  return { user, router };
}

const BACKUP_CODE = 'a'.repeat(64);

beforeEach(() => {
  webauthn.startAuthentication.mockReset();
  webauthn.browserSupportsWebAuthn.mockReturnValue(true);
});

describe('LoginCard second factors', () => {
  it('asks for TOTP after the password when the account requires both', async () => {
    const requests = mockBackend({
      step1: ['PASSWORD'],
      step2: ['TOTP'],
      respond: ({ step }) => (step === '1' ? 202 : 200),
    });
    const { user, router } = await renderCard();

    await user.type(await screen.findByLabelText(en.words.password), 'pw');
    await user.click(screen.getByRole('button', { name: en.words.continue }));
    await user.type(await screen.findByLabelText(en.words.totp), '123456');
    await user.click(screen.getByRole('button', { name: en.words.continue }));

    await screen.findByText('dashboard');
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(requests).toEqual([
      { step: '1', body: { auth_type: 'PASSWORD', data: 'pw' } },
      { step: '2', body: { auth_type: 'TOTP', data: '123456' } },
    ]);
  });

  it('keeps Continue disabled until the TOTP code has six characters', async () => {
    mockBackend({ step1: ['TOTP'], respond: () => 200 });
    const { user } = await renderCard();

    await user.type(await screen.findByLabelText(en.words.totp), '12345');
    expect(screen.getByRole('button', { name: en.words.continue })).toBeDisabled();
    await user.type(screen.getByLabelText(en.words.totp), '6');
    expect(screen.getByRole('button', { name: en.words.continue })).toBeEnabled();
  });

  it('explains a wrong TOTP code and clears the field, every time', async () => {
    mockBackend({ step1: ['TOTP'], respond: () => 401 });
    const { user } = await renderCard();

    for (let attempt = 0; attempt < 2; attempt++) {
      await user.type(await screen.findByLabelText(en.words.totp), '000000');
      await user.click(screen.getByRole('button', { name: en.words.continue }));
      expect(await screen.findByRole('alert')).toHaveTextContent(en.login_page.totp_wrong);
      expect(screen.getByLabelText(en.words.totp)).toHaveValue('');
    }
  });

  it('posts a backup code to step 1 even from the second-factor screen', async () => {
    const requests = mockBackend({
      step1: ['PASSWORD'],
      step2: ['TOTP'],
      respond: ({ step }) => (step === '1' && requests.length === 1 ? 202 : 200),
    });
    const { user } = await renderCard();

    await user.type(await screen.findByLabelText(en.words.password), 'pw');
    await user.click(screen.getByRole('button', { name: en.words.continue }));
    await user.click(await screen.findByRole('button', { name: en.login_page.use_backup_code }));
    // Pasted from the downloaded file, trailing newline included.
    await user.click(screen.getByLabelText(en.words.backup_code));
    await user.paste(`${BACKUP_CODE}\n`);
    await user.click(screen.getByRole('button', { name: en.words.continue }));

    await screen.findByText('dashboard');
    expect(requests[1]).toEqual({ step: '1', body: { auth_type: 'BACKUP', data: BACKUP_CODE } });
  });

  it('stays on the backup screen after a wrong code instead of skipping ahead', async () => {
    mockBackend({ step1: ['PASSWORD'], respond: () => 401 });
    const { user } = await renderCard();

    await user.click(await screen.findByRole('button', { name: en.login_page.use_backup_code }));
    await user.click(screen.getByLabelText(en.words.backup_code));
    await user.paste(BACKUP_CODE);
    await user.click(screen.getByRole('button', { name: en.words.continue }));

    expect(await screen.findByRole('alert')).toHaveTextContent(en.login_page.backup_wrong);
    expect(screen.getByLabelText(en.words.backup_code)).toBeInTheDocument();
  });

  it('returns to the screen that linked to the backup code', async () => {
    mockBackend({ step1: ['TOTP'], respond: () => 200 });
    const { user } = await renderCard();

    await user.click(await screen.findByRole('button', { name: en.login_page.use_backup_code }));
    await user.click(screen.getByRole('button', { name: en.login_page.back }));

    expect(screen.getByLabelText(en.words.totp)).toBeInTheDocument();
  });

  it('signs in with a passkey, sending the assertion object', async () => {
    const assertion = { id: 'cred', rawId: 'cred', type: 'public-key', response: {} };
    webauthn.startAuthentication.mockResolvedValue(assertion);
    const requests = mockBackend({
      step1: ['PASSKEY'],
      webauthnData: '{"challenge":"abc","allowCredentials":[]}',
      respond: () => 200,
    });
    const { user } = await renderCard();

    await user.click(await screen.findByRole('button', { name: en.words.start }));

    await screen.findByText('dashboard');
    expect(webauthn.startAuthentication).toHaveBeenCalledWith({
      optionsJSON: { challenge: 'abc', allowCredentials: [] },
    });
    expect(requests).toEqual([{ step: '1', body: { auth_type: 'PASSKEY', data: assertion } }]);
  });

  it('sends nothing when the passkey prompt is dismissed', async () => {
    const { WebAuthnError } = await import('@simplewebauthn/browser');
    webauthn.startAuthentication.mockRejectedValue(
      new WebAuthnError({
        message: 'dismissed',
        code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',
        cause: Object.assign(new Error('dismissed'), { name: 'NotAllowedError' }),
      }),
    );
    const requests = mockBackend({ step1: ['PASSKEY'], webauthnData: '{}', respond: () => 200 });
    const { user } = await renderCard();

    await user.click(await screen.findByRole('button', { name: en.words.start }));

    await vi.waitFor(() => expect(webauthn.startAuthentication).toHaveBeenCalled());
    expect(requests).toEqual([]);
    expect(screen.getByRole('button', { name: en.words.start })).toBeEnabled();
  });

  it('offers the backup code when a passkey-only account meets a browser without WebAuthn', async () => {
    webauthn.browserSupportsWebAuthn.mockReturnValue(false);
    mockBackend({ step1: ['PASSKEY'], respond: () => 200 });
    const { user } = await renderCard();

    expect(await screen.findByRole('alert')).toHaveTextContent(en.login_page.passkey_unsupported);
    await user.click(screen.getByRole('button', { name: en.login_page.use_backup_code }));
    expect(screen.getByLabelText(en.words.backup_code)).toBeInTheDocument();
  });
});
