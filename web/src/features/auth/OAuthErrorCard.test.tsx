// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import en from '@/locales/en.json';
import { OAuthErrorCard, type OAuthErrorReason } from './OAuthErrorCard';

/**
 * The card holds a `<Link>`, so it needs a router around it. A throwaway router with
 * the card at `/` is enough, and keeps the test independent of the real route tree.
 */
async function renderCard(reason: OAuthErrorReason) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <OAuthErrorCard reason={reason} />,
  });
  // Declared so `to="/account/login"` type-checks and resolves to a real href.
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/account/login',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, loginRoute]),
  });

  // biome-ignore lint/suspicious/noExplicitAny: throwaway test router, not the app's tree
  const result = render(<RouterProvider router={router as any} />);
  await screen.findByRole('heading');
  return result;
}

describe('OAuthErrorCard', () => {
  it('explains the missing-email case specifically', async () => {
    await renderCard('email');

    expect(screen.getByText(en.oauth_error_page.email_body)).toBeInTheDocument();
    expect(screen.queryByText(en.oauth_error_page.generic_body)).not.toBeInTheDocument();
  });

  it('falls back to the generic explanation', async () => {
    await renderCard('generic');

    expect(screen.getByText(en.oauth_error_page.generic_body)).toBeInTheDocument();
    expect(screen.queryByText(en.oauth_error_page.email_body)).not.toBeInTheDocument();
  });

  it('always offers a way back to sign in', async () => {
    await renderCard('generic');

    const link = screen.getByRole('link', { name: en.oauth_error_page.back_to_login });
    expect(link).toHaveAttribute('href', '/account/login');
  });

  // The legacy page pointed users at the upstream author's GitHub issue tracker. Ours
  // must not: it is third-party, and this deployment's users have a local admin.
  it('does not link to an external issue tracker', async () => {
    const { container } = await renderCard('generic');

    expect(container.querySelectorAll('a[href^="http"]')).toHaveLength(0);
  });
});
