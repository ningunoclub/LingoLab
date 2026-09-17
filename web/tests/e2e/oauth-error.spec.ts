// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, test } from '@playwright/test';

/**
 * The page is reached by a redirect from the backend's GitHub handler, which is the only
 * thing that ever sets `?error`. Signed-out state is faked so the app shell doesn't try
 * to resolve a user.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401, body: '' }));
});

test('explains the missing-email case and links back to sign in', async ({ page }) => {
  await page.goto('/account/oauth-error?error=email');

  await expect(page.getByRole('heading', { name: "We couldn't sign you in" })).toBeVisible();
  await expect(page.getByText(/didn't share an email address/i)).toBeVisible();

  await page.getByRole('link', { name: 'Back to sign in' }).click();
  await expect(page).toHaveURL(/\/account\/login/);
});

test('falls back to the generic message when no reason is given', async ({ page }) => {
  await page.goto('/account/oauth-error');

  await expect(page.getByText(/something went wrong while signing you in/i)).toBeVisible();
  await expect(page.getByText(/didn't share an email address/i)).not.toBeVisible();
});

test('treats an unknown reason as the generic case', async ({ page }) => {
  await page.goto('/account/oauth-error?error=something-unexpected');

  await expect(page.getByText(/something went wrong while signing you in/i)).toBeVisible();
});
