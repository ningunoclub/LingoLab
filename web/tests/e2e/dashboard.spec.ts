// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

const USER = { email: 'teacher@school.ch' };

const QUIZZES = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Irregular verbs',
    description: 'Past simple practice',
    public: true,
    cover_image: null,
    questions: [{ question: 'go' }],
    likes: 4,
    dislikes: 1,
    views: 12,
    plays: 9,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Weather words',
    description: null,
    public: false,
    cover_image: null,
    questions: [{ question: 'What is the weather like in Scotland?' }],
    likes: 0,
    dislikes: 0,
    views: 0,
    plays: 0,
  },
];

const QUIZTIVITIES = [{ id: '00000000-0000-4000-8000-0000000000a1', title: 'Flashcards' }];

/** The backend is not running in e2e, so the dashboard endpoints are faked. */
async function mockDashboard(page: Page, options: { deleteStatus?: number } = {}) {
  let quizzes = [...QUIZZES];
  const deleted: string[] = [];

  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
  );
  await page.route('**/api/v1/quiz/list*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quizzes) }),
  );
  await page.route('**/api/v1/quiztivity/', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(QUIZTIVITIES),
    }),
  );
  await page.route('**/api/v1/quiz/delete/*', (route) => {
    const id = route.request().url().split('/').pop() ?? '';
    const status = options.deleteStatus ?? 200;
    if (status === 200) {
      deleted.push(id);
      quizzes = quizzes.filter((quiz) => quiz.id !== id);
    }
    return route.fulfill({ status, contentType: 'application/json', body: '{}' });
  });

  return { deleted };
}

test('lists, searches and deletes quizzes', async ({ page }) => {
  const backend = await mockDashboard(page);
  await page.goto('/dashboard');

  const list = page.getByRole('list').filter({ has: page.getByRole('heading') });
  await expect(list.getByRole('heading', { name: 'Irregular verbs' })).toBeVisible();
  await expect(list.getByRole('heading', { name: 'Weather words' })).toBeVisible();
  await expect(list.getByRole('heading', { name: 'Flashcards' })).toBeVisible();

  // Search runs as you type (legacy never re-ran it) and also looks at question text.
  const search = page.getByRole('searchbox', { name: 'Search for your own quizzes' });
  await search.fill('Scotland');
  await expect(list.getByRole('listitem').first()).toContainText('Weather words');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toHaveValue('');
  await expect(list.getByRole('listitem')).toHaveCount(3);

  // A private quiz cannot be viewed; a quiztivity cannot be downloaded.
  const weather = list.getByRole('listitem').filter({ hasText: 'Weather words' });
  await expect(weather.getByRole('button', { name: 'View' })).toBeDisabled();
  const flashcards = list.getByRole('listitem').filter({ hasText: 'Flashcards' });
  await expect(flashcards.getByRole('button', { name: 'Download' })).toBeDisabled();

  // Analytics shows the quiz's counters.
  const verbs = list.getByRole('listitem').filter({ hasText: 'Irregular verbs' });
  await verbs.getByRole('button', { name: 'Analytics' }).click();
  const analytics = page.getByRole('dialog');
  await expect(analytics.getByText('9', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(analytics).toBeHidden();

  // Delete asks first (no native confirm()), then the list refreshes without a reload.
  await verbs.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('Irregular verbs');
  await confirm.getByRole('button', { name: 'Delete' }).click();

  await expect(list.getByRole('heading', { name: 'Irregular verbs' })).toBeHidden();
  expect(backend.deleted).toEqual([QUIZZES[0].id]);
});

test('keeps the quiz and says so when a delete fails', async ({ page }) => {
  await mockDashboard(page, { deleteStatus: 500 });
  await page.goto('/dashboard');

  const verbs = page.getByRole('listitem').filter({ hasText: 'Irregular verbs' });
  await verbs.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('The quiz was not deleted.')).toBeVisible();
  await expect(verbs).toBeVisible();
});

test('shows the empty state when there is nothing yet', async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
  );
  await page.route('**/api/v1/quiz/list*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/v1/quiztivity/', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );

  await page.goto('/dashboard');

  await expect(page.getByText('import a quiz to get going')).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Create a new quiz' })).toBeVisible();
});

test('sends signed-out visitors to the login page', async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401, body: '' }));

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/account\/login/);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/dashboard');
});

test('starts a game from a quiz and opens the host screen', async ({ page }) => {
  await mockDashboard(page);
  let startUrl: URL | null = null;
  await page.route('**/api/v1/quiz/start/*', (route) => {
    startUrl = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ game_id: 'game-uuid', game_pin: '482913', cqc_code: null }),
    });
  });
  await page.goto('/dashboard');

  const verbs = page.getByRole('listitem').filter({ hasText: 'Irregular verbs' });
  await verbs.getByRole('button', { name: 'Play' }).click();

  const dialog = page.getByRole('dialog');
  // No captcha or controller toggles any more.
  await expect(dialog.getByText(/captcha/i)).toHaveCount(0);
  await expect(dialog.getByRole('radio', { name: /Normal/ })).toBeChecked();
  await dialog.getByRole('radio', { name: /Old-School/ }).check();
  await dialog.getByLabel('Custom field').fill('Class');
  await dialog.getByRole('switch', { name: 'Randomize answers' }).click();
  await dialog.getByRole('button', { name: 'Start Game' }).click();

  // Same URL shape as legacy: bare digits, not JSON-quoted strings.
  await expect(page).toHaveURL(/\/admin\?token=game-uuid&pin=482913&connect=1$/);
  const admin = new URL(page.url()).searchParams;
  expect(admin.get('token')).toBe('game-uuid');
  expect(admin.get('pin')).toBe('482913');
  expect(admin.get('connect')).toBe('1');

  const sent = (startUrl as URL | null)?.searchParams;
  expect(sent?.get('captcha_enabled')).toBe('false');
  expect(sent?.get('game_mode')).toBe('normal');
  expect(sent?.get('custom_field')).toBe('Class');
  expect(sent?.get('randomize_answers')).toBe('true');
});

test('reports a failed game start in the dialog instead of logging out', async ({ page }) => {
  await mockDashboard(page);
  await page.route('**/api/v1/quiz/start/*', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }),
  );
  await page.goto('/dashboard');

  const verbs = page.getByRole('listitem').filter({ hasText: 'Irregular verbs' });
  await verbs.getByRole('button', { name: 'Play' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Start Game' }).click();

  await expect(dialog.getByRole('alert')).toContainText('could not be started');
  await expect(page).toHaveURL(/\/dashboard$/);
});
