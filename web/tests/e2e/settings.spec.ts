// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

const USER = {
  id: 'user-1',
  email: 'teacher@school.ch',
  username: 'teacher',
  verified: true,
  created_at: '2026-01-01T00:00:00',
};

const SESSIONS = [
  {
    id: 'session-current',
    session_key: 'secret-current',
    created_at: '2026-09-01T10:00:00',
    last_seen: '2026-09-17T13:00:00',
    user_agent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  },
  {
    id: 'session-phone',
    session_key: 'secret-phone',
    created_at: '2026-09-10T08:00:00',
    last_seen: '2026-09-16T20:00:00',
    user_agent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  },
];

/** The backend is not running in e2e, so the settings endpoints are faked. */
async function mockSettingsBackend(page: Page, options: { apiKeys?: string[] } = {}) {
  const apiKeys = options.apiKeys ?? ['abcd11112222333344445678'];

  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
  );
  await page.route('**/api/v1/users/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
  );
  await page.route('**/api/v1/users/sessions/list', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSIONS) }),
  );
  await page.route('**/api/v1/users/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SESSIONS[0]),
    }),
  );
  await page.route('**/api/v1/users/api_keys*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiKeys.map((key) => ({ key }))),
    }),
  );
  // The avatar is an image endpoint; answer with a 1x1 gif so no request fails.
  await page.route('**/api/v1/users/avatar', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/gif',
      body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64'),
    }),
  );
}

test('shows the account, its devices and its API keys', async ({ page }) => {
  await mockSettingsBackend(page);
  await page.goto('/account/settings');

  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('teacher@school.ch')).toBeVisible();

  // The user agents are rendered as readable device names, not raw UA strings.
  await expect(page.getByText('Chrome 140 (macOS)')).toBeVisible();
  await expect(page.getByText('Safari 18 (iOS)')).toBeVisible();
  await expect(page.getByText('This device', { exact: true })).toBeVisible();

  // A session key is a live credential and must never reach the page.
  await expect(page.locator('body')).not.toContainText('secret-current');
  await expect(page.locator('body')).not.toContainText('secret-phone');
});

test('keeps an API key masked until it is revealed', async ({ page }) => {
  await mockSettingsBackend(page, { apiKeys: ['abcd11112222333344445678'] });
  await page.goto('/account/settings');

  const key = 'abcd11112222333344445678';
  await expect(page.getByText(key, { exact: true })).toBeHidden();

  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page.getByText(key, { exact: true })).toBeVisible();
});

test('confirms before deleting an API key', async ({ page }) => {
  await mockSettingsBackend(page);
  await page.goto('/account/settings');

  let deleteCalled = false;
  await page.route('**/api/v1/users/api_keys?api_key=*', async (route) => {
    if (route.request().method() === 'DELETE') {
      deleteCalled = true;
      return route.fulfill({ status: 200, body: '' });
    }
    return route.fallback();
  });

  // The API keys card and the sessions table both have Delete buttons; take the first.
  await page.getByRole('button', { name: 'Delete' }).first().click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Delete this API key?');

  // Cancelling must not delete anything.
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(deleteCalled).toBe(false);
});

test('validates the password form before sending anything', async ({ page }) => {
  await mockSettingsBackend(page);
  await page.goto('/account/settings');

  let updateCalled = false;
  await page.route('**/api/v1/users/password/update', (route) => {
    updateCalled = true;
    return route.fulfill({ status: 200, body: '' });
  });

  await page.getByLabel('Old password').fill('current-password');
  await page.getByLabel('New password', { exact: true }).fill('a-new-password');
  await page.getByLabel('Repeat password').fill('a-different-password');
  await page.getByRole('button', { name: 'Change password!' }).click();

  await expect(page.getByText("The two passwords don't match.")).toBeVisible();
  expect(updateCalled).toBe(false);
});

test('sends signed-out visitors to the login page', async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401, body: '' }));

  await page.goto('/account/settings');
  await expect(page).toHaveURL(/\/account\/login\?returnTo=%2Faccount%2Fsettings/);
});
