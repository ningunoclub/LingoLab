// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { config } from '@/config';

/**
 * OAuth entry points, ported from `oauth_block.svelte`.
 *
 * These are plain links, not fetches: the backend owns the whole redirect dance and
 * sets the session cookie at the end of it. Providers are gated by build-time flags,
 * so a self-hosted instance without OAuth renders nothing here.
 *
 * Upstream's inline Google/GitHub brand SVGs are dropped in favour of a neutral icon:
 * the design system allows lucide icons only, and the brand marks carry their own
 * trademark terms.
 */
export function OAuthBlock() {
  const { t } = useTranslation();
  const { google, github, customName } = config.oauth;

  const providers: { key: string; href: string; label: string }[] = [];
  if (google) {
    providers.push({
      key: 'google',
      href: '/api/v1/users/oauth/google/login',
      label: t('login_page.oauth_with', { provider: 'Google' }),
    });
  }
  if (github) {
    providers.push({
      key: 'github',
      href: '/api/v1/users/oauth/github/login',
      label: t('login_page.oauth_with', { provider: 'GitHub' }),
    });
  }
  if (customName) {
    providers.push({
      key: 'custom',
      href: '/api/v1/users/oauth/custom/login',
      label: t('login_page.oauth_with', { provider: customName }),
    });
  }

  if (providers.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground text-xs uppercase tracking-wide">
          {t('login_page.or')}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {providers.map((provider) => (
        <Button key={provider.key} asChild variant="outline" className="w-full">
          <a href={provider.href}>
            <KeyRound aria-hidden="true" />
            {provider.label}
          </a>
        </Button>
      ))}
    </div>
  );
}
