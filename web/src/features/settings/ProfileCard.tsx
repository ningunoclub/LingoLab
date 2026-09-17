// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SettingsUser } from './settingsApi';

/**
 * Identity block: avatar, username, email and the links out to the other settings pages.
 *
 * Legacy links to `/account/controllers` (hardware buzzer boxes) as well. That route is a
 * Phase 4 cut candidate and has no React page, so it is left out rather than pointing at
 * a placeholder; see MIGRATION.md.
 */
export function ProfileCard({ user }: { user: SettingsUser }) {
  const { t } = useTranslation();
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/*
          The avatar endpoint can answer 401/404, which would otherwise leave a broken
          image with the alt text spilling out of the box. A failure falls back to the
          initial instead.
        */}
        {avatarFailed ? (
          <div
            className="flex size-24 shrink-0 items-center justify-center rounded-md border bg-muted"
            aria-hidden="true"
          >
            <span className="font-display text-3xl font-semibold text-muted-foreground">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          </div>
        ) : (
          <img
            // The endpoint answers for the signed-in user; no id in the path.
            src="/api/v1/users/avatar"
            alt={t('settings_page.avatar_alt', { username: user.username })}
            className="size-24 shrink-0 rounded-md border bg-muted object-cover"
            width={96}
            height={96}
            onError={() => setAvatarFailed(true)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-semibold break-words">{user.username}</h2>
            {user.verified ? (
              <Badge variant="secondary">{t('settings_page.verified')}</Badge>
            ) : (
              <Badge variant="outline">{t('settings_page.not_verified')}</Badge>
            )}
          </div>

          <p className="text-muted-foreground break-words">
            {t('words.email')}: {user.email}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/account/settings/avatar">{t('settings_page.change_avatar')}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/account/settings/security">{t('settings_page.security_settings')}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/user/$userId" params={{ userId: user.id }}>
                {t('settings_page.public_profile')}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
