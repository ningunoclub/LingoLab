// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';
import fixture from '../fixtures/game-result.json' with { type: 'json' };

const USER = { email: 'teacher@school.ch' };

/** The backend is not running in e2e, so the results endpoints are faked. */
async function mockResults(page: Page, list: unknown[] = [{ ...fixture, note: 'Class 3b' }]) {
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
  );
  // Registered before the single-result route: Playwright tries the newest route first.
  await page.route('**/api/v1/results/*', (route) =>
    route.request().url().endsWith(fixture.id)
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixture),
        })
      : route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: '{"detail":"Game Result not found"}',
        }),
  );
  await page.route('**/api/v1/results/list', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) }),
  );
}

test('lists saved games and opens one in its three tabs', async ({ page }) => {
  await mockResults(page);
  await page.goto('/results');

  // Phones get cards and wider screens a table; only one of them is visible.
  await expect(page.getByText('Class 3b').filter({ visible: true })).toBeVisible();
  await page.getByRole('link', { name: 'Irregular verbs' }).filter({ visible: true }).click();

  await expect(page).toHaveURL(`/results/${fixture.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Irregular verbs' })).toBeVisible();
  await expect(page.getByText(/had 3 players with an average score of 733/)).toBeVisible();

  await page.getByRole('tab', { name: 'Players' }).click();
  await expect(page.getByRole('row').nth(1)).toContainText('Anna');

  await page.getByRole('tab', { name: 'Questions' }).click();
  await page.getByRole('button', { name: /Which are past forms/ }).click();
  await expect(page.getByRole('cell', { name: 'saw, took' })).toBeVisible();

  await page.getByRole('link', { name: 'All results' }).click();
  await expect(page).toHaveURL('/results');
});

test('shows the empty state when nothing is saved', async ({ page }) => {
  await mockResults(page, []);
  await page.goto('/results');
  await expect(page.getByText('No results saved so far...')).toBeVisible();
});

test('says when a result does not exist', async ({ page }) => {
  await mockResults(page);
  await page.goto('/results/00000000-0000-4000-8000-00000000dead');
  await expect(page.getByRole('heading', { name: 'Result not found' })).toBeVisible();
});

test('sends signed-out visitors to the login page', async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401 }));
  await page.goto(`/results/${fixture.id}`);
  await expect(page).toHaveURL(new RegExp(`/account/login\\?returnTo=%2Fresults%2F${fixture.id}`));
});
