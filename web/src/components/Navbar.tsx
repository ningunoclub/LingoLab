// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// Ported from frontend/src/lib/navbar.svelte. Upstream branding is deliberately not carried over.
import { Link, useRouter } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/auth/useCurrentUser';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/config';
import type { TranslationKey } from '@/i18n';

type NavLink = { to: string; labelKey: TranslationKey };

const PUBLIC_LINKS: readonly NavLink[] = [
  { to: '/play', labelKey: 'words.play' },
  { to: '/explore', labelKey: 'words.explore' },
  { to: '/search', labelKey: 'words.search' },
];

export function Navbar() {
  const { t } = useTranslation();
  const { isSignedIn } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  // Legacy closed the mobile menu on navigation so the new page is visible.
  useEffect(() => router.subscribe('onResolved', () => setMenuOpen(false)), [router]);

  const links: NavLink[] = [
    ...PUBLIC_LINKS,
    isSignedIn
      ? { to: '/dashboard', labelKey: 'words.dashboard' }
      : { to: '/docs', labelKey: 'words.docs' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
      <nav
        aria-label={t('words.overview')}
        className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 lg:px-8"
      >
        <div className="flex items-center gap-1">
          <Link
            to="/"
            className="px-2 font-display text-xl font-bold tracking-tight text-foreground"
          >
            {APP_NAME}
          </Link>
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {links.map(({ to, labelKey }) => (
              <Button key={to} asChild variant="ghost" size="sm">
                <Link to={to} activeProps={{ 'data-active': 'true' }}>
                  {t(labelKey)}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {isSignedIn ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/account/settings">{t('words.settings')}</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/account/login">{t('words.login')}</Link>
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t('a11y.close_menu') : t('a11y.open_menu')}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </nav>

      {menuOpen ? (
        <div id="mobile-menu" className="border-t px-4 py-2 lg:hidden">
          <ul className="flex flex-col gap-1">
            {links.map(({ to, labelKey }) => (
              <li key={to}>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link to={to}>{t(labelKey)}</Link>
                </Button>
              </li>
            ))}
            <li>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to={isSignedIn ? '/account/settings' : '/account/login'}>
                  {isSignedIn ? t('words.settings') : t('words.login')}
                </Link>
              </Button>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
