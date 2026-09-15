// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, test } from '@playwright/test';

test.describe('styleguide', () => {
  test('renders every token section with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      // The browser logs the auth check's 401 itself. That response is expected for a
      // signed-out visitor and is handled, so it is not an application error.
      const text = message.text();
      const isExpected401 = /Failed to load resource/.test(text);
      if (message.type() === 'error' && !isExpected401) errors.push(text);
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()}`));

    await page.goto('/styleguide');

    await expect(page.getByRole('heading', { name: 'Style guide', level: 1 })).toBeVisible();
    for (const section of ['Colours', 'Typography', 'Buttons', 'Inputs', 'Cards', 'Answer tiles']) {
      await expect(page.getByRole('heading', { name: section, level: 2 })).toBeVisible();
    }

    // Six answer tiles, each with its own shape.
    await expect(page.getByRole('button', { name: /Answer \d · / })).toHaveCount(6);

    expect(errors).toEqual([]);
  });

  test('switches between light and dark', async ({ page }) => {
    await page.goto('/styleguide');
    const html = page.locator('html');

    await page.getByRole('button', { name: 'Change theme' }).click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Change theme' }).click();
    await page.getByRole('menuitem', { name: 'Light' }).click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('switches language to German', async ({ page }) => {
    await page.goto('/styleguide');

    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('menuitem', { name: 'Deutsch' }).click();

    await expect(page.getByRole('heading', { name: 'Styleguide', level: 1 })).toBeVisible();
  });
});
