// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, test } from '@playwright/test';

test('home renders the app shell and reaches a 404', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'LingoLab' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();

  await page.goto('/this-route-does-not-exist');
  await expect(page.getByText('404')).toBeVisible();
});
