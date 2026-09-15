// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, test } from '@playwright/test';

test.describe('styleguide', () => {
  test('renders every token section with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

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
