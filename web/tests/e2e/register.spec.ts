// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

/**
 * The backend is not running in e2e, so `users/create` is faked at the network layer.
 * The test is about the page: what it sends, which outcome modal it shows, and whether
 * a failed attempt still leaves the form filled in.
 */
async function mockRegisterBackend(page: Page, status: number) {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401, body: '' }));
  await page.route('**/api/v1/users/create', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(
        status === 200
          ? { id: 'uuid', email: 'teacher@school.ch', verified: false }
          : { detail: 'nope' },
      ),
    }),
  );
}

async function fillValidForm(page: Page) {
  await page.getByLabel('E-mail address').fill('teacher@school.ch');
  await page.getByLabel('Username', { exact: true }).fill('teacher');
  await page.getByLabel('Password', { exact: true }).fill('a-good-password');
  await page.getByLabel('Repeat password').fill('a-good-password');
  await page.getByRole('checkbox', { name: /privacy policy/i }).click();
  await page.getByRole('checkbox', { name: /terms of service/i }).click();
}

test('creates an account and points the user at their inbox', async ({ page }) => {
  await mockRegisterBackend(page, 200);

  let sent: unknown;
  await page.route('**/api/v1/users/create', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'uuid', email: 'teacher@school.ch', verified: false }),
    });
  });

  await page.goto('/account/register');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Register' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Account created');
  await expect(dialog).toContainText('confirm your email address');

  // Only the fields the backend's RouteUser accepts, with a single password.
  expect(sent).toEqual({
    email: 'teacher@school.ch',
    username: 'teacher',
    password: 'a-good-password',
  });

  // Closing the success dialog continues to login, where the mailed link lands them.
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/account\/login/);
});

test('reports a duplicate account without clearing the form', async ({ page }) => {
  await mockRegisterBackend(page, 409);

  await page.goto('/account/register');
  await fillValidForm(page);
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('dialog')).toContainText('already exists');

  // Legacy reloaded the page here, discarding everything typed. We keep it.
  // The dialog also has shadcn's corner "X", also named Close, so target the footer one.
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByLabel('E-mail address')).toHaveValue('teacher@school.ch');
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('teacher');
});

test('blocks submission until the form is valid', async ({ page }) => {
  await mockRegisterBackend(page, 200);
  await page.goto('/account/register');

  const submit = page.getByRole('button', { name: 'Register' });
  await expect(submit).toBeDisabled();

  // Everything valid except the two consent boxes.
  await page.getByLabel('E-mail address').fill('teacher@school.ch');
  await page.getByLabel('Username', { exact: true }).fill('teacher');
  await page.getByLabel('Password', { exact: true }).fill('a-good-password');
  await page.getByLabel('Repeat password').fill('a-good-password');
  await expect(submit).toBeDisabled();

  await page.getByRole('checkbox', { name: /privacy policy/i }).click();
  await page.getByRole('checkbox', { name: /terms of service/i }).click();
  await expect(submit).toBeEnabled();
});

test('explains a mismatched password confirmation', async ({ page }) => {
  await mockRegisterBackend(page, 200);
  await page.goto('/account/register');

  await page.getByLabel('Password', { exact: true }).fill('a-good-password');
  await page.getByLabel('Repeat password').fill('something-else');
  await page.getByLabel('Username', { exact: true }).click();

  await expect(page.getByText('Passwords do not match.')).toBeVisible();
});
