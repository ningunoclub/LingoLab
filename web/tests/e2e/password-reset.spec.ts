// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

/**
 * Covers both halves of the reset flow. Note the route names are inverted upstream and
 * kept that way (they appear in already-sent emails):
 *
 *   /account/reset-password  -> request the mail
 *   /account/password-reset  -> redeem the token from it
 *
 * The backend is not running in e2e, so both endpoints are faked at the network layer.
 */
async function signedOut(page: Page) {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401, body: '' }));
}

test('asks for a reset link without revealing whether the account exists', async ({ page }) => {
  await signedOut(page);

  let sent: unknown;
  await page.route('**/api/v1/users/forgot-password', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Password reset email sent' }),
    });
  });

  await page.goto('/account/reset-password');
  await page.getByLabel('E-mail address').fill('teacher@school.ch');
  await page.getByRole('button', { name: 'Send reset link' }).click();

  await expect(page.getByText('Check your inbox')).toBeVisible();
  // Conditional by design: the backend answers 200 for unknown addresses too.
  await expect(page.getByText(/If an account exists for teacher@school\.ch/)).toBeVisible();

  expect(sent).toEqual({ email: 'teacher@school.ch' });
});

test('holds the request button until the address parses', async ({ page }) => {
  await signedOut(page);
  await page.goto('/account/reset-password');

  const submit = page.getByRole('button', { name: 'Send reset link' });
  await expect(submit).toBeDisabled();

  await page.getByLabel('E-mail address').fill('not-an-email');
  await expect(submit).toBeDisabled();

  await page.getByLabel('E-mail address').fill('teacher@school.ch');
  await expect(submit).toBeEnabled();
});

test('sets a new password using the token from the mail', async ({ page }) => {
  await signedOut(page);

  let sent: unknown;
  await page.route('**/api/v1/users/reset-password', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Password updated successfully' }),
    });
  });

  await page.goto('/account/password-reset?token=deadbeef');
  await page.getByLabel('Password', { exact: true }).fill('a-new-password');
  await page.getByLabel('Repeat password').fill('a-new-password');
  await page.getByRole('button', { name: 'Save new password' }).click();

  // The whole point of the port: legacy sent `token: undefined` here and always got a 400.
  expect(sent).toEqual({ password: 'a-new-password', token: 'deadbeef' });

  await expect(page).toHaveURL(/\/account\/login/);
});

test('explains an expired link instead of failing on submit', async ({ page }) => {
  await signedOut(page);
  await page.route('**/api/v1/users/reset-password', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Invalid token' }),
    }),
  );

  await page.goto('/account/password-reset?token=stale');
  await page.getByLabel('Password', { exact: true }).fill('a-new-password');
  await page.getByLabel('Repeat password').fill('a-new-password');
  await page.getByRole('button', { name: 'Save new password' }).click();

  await expect(page.getByText('This link is no longer valid')).toBeVisible();
  // The form is gone: a rejected token cannot be retried by typing again.
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Request a new link' }).click();
  await expect(page).toHaveURL(/\/account\/reset-password/);
});

test('offers a way out when the link carries no token', async ({ page }) => {
  await signedOut(page);
  await page.goto('/account/password-reset');

  await expect(page.getByText('Something is missing from this link')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
});

test('explains a mismatched confirmation before submitting', async ({ page }) => {
  await signedOut(page);
  await page.goto('/account/password-reset?token=deadbeef');

  await page.getByLabel('Password', { exact: true }).fill('a-new-password');
  await page.getByLabel('Repeat password').fill('something-else');
  await page.getByLabel('Password', { exact: true }).click();

  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save new password' })).toBeDisabled();
});
