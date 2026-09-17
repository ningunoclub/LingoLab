// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

const USER = {
  id: 'user-1',
  email: 'teacher@school.ch',
  username: 'teacher',
  verified: true,
  created_at: '2026-01-01T00:00:00',
  require_password: false,
};

type BackendOptions = {
  totpActivated?: boolean;
  keys?: { id: number }[];
  requirePassword?: boolean;
};

/**
 * The backend is not running in e2e, so the security endpoints are faked.
 *
 * The WebAuthn ceremony itself is not exercised here: it needs a real authenticator (or
 * a CDP virtual one) and the browser's own permission UI, neither of which belongs in
 * this spec. Registration is covered up to the point where the browser takes over.
 */
async function mockSecurityBackend(page: Page, options: BackendOptions = {}) {
  const totpActivated = options.totpActivated ?? false;
  const keys = options.keys ?? [];
  const requirePassword = options.requirePassword ?? false;

  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/v1/users/check', (route) => route.fulfill(json(USER)));
  await page.route('**/api/v1/users/me', (route) =>
    route.fulfill(json({ ...USER, require_password: requirePassword })),
  );
  await page.route('**/api/v1/users/webauthn/list', (route) => route.fulfill(json(keys)));
  await page.route('**/api/v1/users/2fa/totp', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill(json({ activated: totpActivated }));
    }
    return route.fulfill(
      json({ url: 'otpauth://totp/LingoLab:teacher', secret: 'JBSWY3DPEHPK3PXP' }),
    );
  });
}

test('shows the four security sections with their current state', async ({ page }) => {
  await mockSecurityBackend(page, { totpActivated: false, keys: [] });
  await page.goto('/account/settings/security');

  await expect(page.getByRole('heading', { name: 'Security', exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Backup-Code' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TOTP' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Webauthn' })).toBeVisible();

  await expect(page.getByText('TOTP is not available')).toBeVisible();
  await expect(page.getByText('Webauthn is not available')).toBeVisible();
  await expect(page.getByText('No security keys yet.')).toBeVisible();

  // With TOTP off, the require-password switch is unavailable and says why.
  await expect(page.getByRole('switch')).toBeDisabled();
  await expect(page.getByText('Turn on TOTP first.')).toBeVisible();
});

test('reflects an account that already has TOTP and a security key', async ({ page }) => {
  await mockSecurityBackend(page, {
    totpActivated: true,
    keys: [{ id: 1 }, { id: 2 }],
    requirePassword: true,
  });
  await page.goto('/account/settings/security');

  await expect(page.getByText('TOTP is available')).toBeVisible();
  await expect(page.getByText('Webauthn is available')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn off TOTP' })).toBeVisible();

  await expect(page.getByText('Security key 1')).toBeVisible();
  await expect(page.getByText('Security key 2')).toBeVisible();

  const toggle = page.getByRole('switch');
  await expect(toggle).toBeEnabled();
  await expect(toggle).toBeChecked();
});

test('asks for the password before turning TOTP on, and shows the setup code', async ({ page }) => {
  await mockSecurityBackend(page, { totpActivated: false });
  await page.goto('/account/settings/security');

  await page.getByRole('button', { name: 'Turn on TOTP' }).click();

  // The native prompt() is gone; a real dialog asks instead.
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Confirm your password')).toBeVisible();

  await dialog.getByLabel('Current password').fill('hunter2');
  await dialog.getByRole('button', { name: 'Confirm' }).click();

  // The QR code and the secret are both offered, as legacy did.
  await expect(page.getByRole('heading', { name: 'TOTP-setup' })).toBeVisible();
  await expect(page.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();
  await expect(page.locator('svg').first()).toBeVisible();
});

test('cancelling the password dialog makes no request', async ({ page }) => {
  await mockSecurityBackend(page, { totpActivated: false });

  const posts: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url());
  });

  await page.goto('/account/settings/security');
  await page.getByRole('button', { name: 'Turn on TOTP' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  expect(posts.filter((url) => url.includes('/2fa/totp'))).toHaveLength(0);
});

test('warns before replacing an existing backup code', async ({ page }) => {
  await mockSecurityBackend(page);
  await page.route('**/api/v1/users/2fa/backup_code', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'a1b2c3d4e5f6' }),
    }),
  );
  await page.goto('/account/settings/security');

  await page.getByRole('button', { name: 'Get Backup-Code' }).click();

  const confirm = page.getByRole('alertdialog');
  await expect(confirm.getByText('Replace your backup code?')).toBeVisible();
  await confirm.getByRole('button', { name: 'Get Backup-Code' }).click();

  const password = page.getByRole('dialog');
  await password.getByLabel('Current password').fill('hunter2');
  await password.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.getByText('a1b2c3d4e5f6')).toBeVisible();
  await expect(page.getByText('Save this somewhere safe!')).toBeVisible();
});

test('reports a wrong password instead of silently failing', async ({ page }) => {
  await mockSecurityBackend(page, { totpActivated: false });

  // A rejected mutation must not also escape as an unhandled rejection.
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/api/v1/users/2fa/totp', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ activated: false }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Invalid' }),
    });
  });

  await page.goto('/account/settings/security');
  await page.getByRole('button', { name: 'Turn on TOTP' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Current password').fill('wrong');
  await dialog.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.getByText('That password is not correct.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('redirects a signed-out visitor to the login page', async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
  );

  await page.goto('/account/settings/security');
  await expect(page).toHaveURL(/\/account\/login\?returnTo=/);
});
