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

/** A 1x1 transparent gif, standing in for the rendered avatar SVG. */
const PIXEL = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');

/** The backend is not running in e2e, so the avatar endpoints are faked. */
async function mockAvatarBackend(page: Page, options: { saveStatus?: number } = {}) {
  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
  );
  await page.route('**/api/v1/avatar/custom*', (route) =>
    route.fulfill({ status: 200, contentType: 'image/gif', body: PIXEL }),
  );
  await page.route('**/api/v1/avatar/save*', (route) =>
    route.fulfill({
      status: options.saveStatus ?? 200,
      contentType: 'application/json',
      body: '{}',
    }),
  );
}

/** Legacy advances a step per tile click, so twelve clicks complete the avatar. */
async function completeWizard(page: Page) {
  for (let step = 0; step < 12; step++) {
    // The grid is a fieldset of option tiles; the first one always exists for every
    // feature, so picking it walks the wizard without depending on the option labels.
    await page.locator('fieldset button').first().click();
  }
}

test('walks the twelve steps and saves the avatar', async ({ page }) => {
  await mockAvatarBackend(page);

  // Reduced motion, so the reveal's controls are usable at once rather than after 3.5s.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/account/settings/avatar');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Step 1 of 12')).toBeVisible();

  // Back is unavailable on the first step; Finish only on the last.
  await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Finish' })).toBeDisabled();

  await page.getByRole('button', { name: 'Skin color, option 2', exact: true }).click();
  await expect(page.getByText('Step 2 of 12')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back' })).toBeEnabled();

  // Stepping back keeps the choice, which stays marked.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('Step 1 of 12')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Skin color, option 2', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');

  await completeWizard(page);

  const reveal = page.getByRole('dialog');
  await expect(reveal).toBeVisible();
  await expect(reveal.getByText("That's You!")).toBeVisible();

  const save = page.waitForRequest(
    (request) => request.url().includes('/api/v1/avatar/save') && request.method() === 'POST',
  );
  await reveal.getByRole('button', { name: 'Save' }).click();

  // Every feature is sent, so the saved avatar matches the preview.
  const params = new URL((await save).url()).searchParams;
  for (const feature of ['skin_color', 'top_type', 'hair_color', 'clothe_graphic_type']) {
    expect(params.get(feature)).not.toBeNull();
  }

  await expect(reveal.getByRole('button', { name: 'Saved' })).toBeDisabled();
});

test('reports a failed save instead of hanging on the spinner', async ({ page }) => {
  await mockAvatarBackend(page, { saveStatus: 500 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/account/settings/avatar');

  await completeWizard(page);

  const reveal = page.getByRole('dialog');
  await reveal.getByRole('button', { name: 'Save' }).click();

  // Legacy's `if (res.ok)` has no else branch: the spinner would never resolve.
  await expect(reveal.getByText(/couldn't be saved/i)).toBeVisible();
  await expect(reveal.getByRole('button', { name: 'Save' })).toBeEnabled();
});

test('sends signed-out visitors to the login page', async ({ page }) => {
  await page.route('**/api/v1/users/check', (route) => route.fulfill({ status: 401, body: '' }));

  await page.goto('/account/settings/avatar');

  // Legacy has no guard here and only fails at save; the port guards the route.
  await expect(page).toHaveURL(/\/account\/login/);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/account/settings/avatar');
});
