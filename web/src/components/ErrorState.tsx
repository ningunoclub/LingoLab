// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// Replaces the legacy +error.svelte generic-error branch.
import { Link, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { config } from '@/config';

export function ErrorState({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center"
    >
      <h1 className="font-display text-2xl font-semibold">{t('words.error')}</h1>
      <p className="prose-measure text-muted-foreground">{t('error_page.unknown_error_text')}</p>
      {/* Error details in dev only: they can carry personal data and must not reach users. */}
      {config.isDev && error instanceof Error ? (
        <pre className="max-w-full overflow-x-auto rounded-md border bg-muted p-3 text-left text-xs">
          {error.message}
        </pre>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={() => void router.invalidate()}>{t('words.retry')}</Button>
        <Button asChild variant="secondary">
          <Link to="/">{t('words.home')}</Link>
        </Button>
      </div>
    </div>
  );
}
