// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';
import fixture from '../fixtures/public-quiz.json' with { type: 'json' };

/** The backend is not running in e2e, so the endpoints of the page are faked. */
async function mockView(page: Page) {
  const calls = { views: 0, ratings: [] as unknown[] };
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ email: 'teacher@school.ch' }),
    }),
  );
  await page.route('**/api/v1/quiz/get/public/*', (route) => {
    calls.views += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture),
    });
  });
  await page.route('**/api/v1/community/rate/*', (route) => {
    calls.ratings.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return calls;
}

test('shows a quiz, rates it, opens a question and the start-game dialog', async ({ page }) => {
  const calls = await mockView(page);
  await page.goto(`/view/${fixture.id}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Irregular verbs' })).toBeVisible();
  await expect(page.getByRole('link', { name: '@devteacher' })).toBeVisible();

  await page.getByRole('button', { name: 'Like this quiz!', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Like this quiz!', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(calls.ratings).toEqual([{ type: 'LIKE' }]);

  await page.getByRole('button', { name: /Which are past forms/ }).click();
  await expect(page.getByText('took')).toBeVisible();

  // The slide is drawn into an image once its section opens.
  await page.getByRole('button', { name: /Welcome/ }).click();
  await expect(page.locator('img[src^="data:image/png"]')).toBeVisible();

  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  // Every request is a view on the server, so the page asks only once.
  expect(calls.views).toBe(1);
});

test('opens every question with ?autoExpand=true', async ({ page }) => {
  await mockView(page);
  await page.goto(`/view/${fixture.id}?autoExpand=true`);
  await expect(page.getByText('went', { exact: true })).toBeVisible();
  await expect(page.getByText('had breakfast')).toBeVisible();
});
