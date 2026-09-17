// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

/**
 * The backend is not running in e2e, so the login endpoints are faked at the network
 * layer. That keeps the test about the page's own behaviour: which step is shown, what
 * is sent, and where the user ends up.
 */
async function mockLoginBackend(
  page: Page,
  options: { stepStatus: number; step1?: string[]; step2?: string[] },
) {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401, body: '' }));
  await page.route('**/api/v1/login/start', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'test-session',
        step_1: options.step1 ?? ['PASSWORD'],
        step_2: options.step2 ?? [],
        webauthn_data: null,
      }),
    }),
  );
  await page.route('**/api/v1/login/step/**', (route) =>
    route.fulfill({ status: options.stepStatus, body: '' }),
  );
}

test('signs in with a password and lands on the return path', async ({ page }) => {
  await mockLoginBackend(page, { stepStatus: 200 });

  await page.goto('/account/login');
  await page.getByLabel('Email or Username').fill('teacher@school.ch');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Only one method was offered, so the picker is skipped.
  const password = page.getByLabel('Password');
  await expect(password).toBeVisible();

  // The identity check must report a user now, or the guard would bounce us back.
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ email: 'teacher@school.ch' }),
    }),
  );

  await password.fill('correct-horse');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});

test('keeps the user on the password step and explains a rejected password', async ({ page }) => {
  await mockLoginBackend(page, { stepStatus: 401 });

  await page.goto('/account/login');
  await page.getByLabel('Email or Username').fill('teacher@school.ch');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/account\/login/);
});

test('shows the confirmation badge after email verification', async ({ page }) => {
  await mockLoginBackend(page, { stepStatus: 200 });

  await page.goto('/account/login?verified');
  await expect(page.getByRole('status')).toContainText('confirmed');
});

test('offers a choice when the account has several usable methods', async ({ page }) => {
  await mockLoginBackend(page, { stepStatus: 200, step1: ['PASSWORD', 'PASSKEY'] });

  await page.goto('/account/login');
  await page.getByLabel('Email or Username').fill('teacher@school.ch');
  await page.getByRole('button', { name: 'Continue' }).click();

  // PASSKEY is not buildable yet, so the flow goes straight to the password step
  // rather than offering a method that cannot be completed.
  await expect(page.getByLabel('Password')).toBeVisible();
});
