// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/components/ErrorState';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { NotFound } from '@/components/NotFound';
import { Toaster } from '@/components/ui/sonner';
import { useUiStore } from '@/stores/uiStore';

export type RouterContext = { queryClient: QueryClient };

function RootLayout() {
  const navbarVisible = useUiStore((state) => state.navbarVisible);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        {t('a11y.skip_to_content')}
      </a>
      {navbarVisible ? <Navbar /> : null}
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      {navbarVisible ? <Footer /> : null}
      <Toaster position="top-center" />
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ error }) => <ErrorState error={error} />,
  notFoundComponent: () => <NotFound />,
});
