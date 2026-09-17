// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { requireAuth } from '@/auth/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiKeysCard } from '@/features/settings/ApiKeysCard';
import { ChangePasswordCard } from '@/features/settings/ChangePasswordCard';
import { ProfileCard } from '@/features/settings/ProfileCard';
import { SessionsCard } from '@/features/settings/SessionsCard';
import { settingsQueries } from '@/features/settings/settingsApi';

function SettingsPage() {
  const { t } = useTranslation();
  const user = useQuery(settingsQueries.user);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">{t('words.settings')}</h1>

      {user.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : user.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{t('settings_page.errors.account_failed')}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => user.refetch()}>
            {t('words.retry')}
          </Button>
        </div>
      ) : (
        <ProfileCard user={user.data} />
      )}

      <ChangePasswordCard username={user.data?.username ?? ''} />
      <ApiKeysCard />
      <SessionsCard />
    </div>
  );
}

export const Route = createFileRoute('/account/settings')({
  // Legacy `+page.server.ts`: signed-out visitors are bounced to the login page with a
  // returnTo pointing back here.
  beforeLoad: ({ context }) => requireAuth(context.queryClient, '/account/settings'),
  component: SettingsPage,
});
