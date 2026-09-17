// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { APP_NAME, config } from '@/config';

function Home() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{APP_NAME}</h1>
      <p className="prose-measure text-lg text-muted-foreground">{t('index_page.slogan')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/play">{t('words.play')}</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link to="/explore">{t('words.explore')}</Link>
        </Button>
      </div>
      {/* Phase 0 has no routes yet beyond this shell; the styleguide is the dev entry point. */}
      {config.isDev ? (
        <Button asChild variant="ghost" size="sm">
          <Link to="/styleguide">{t('styleguide.title')}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute('/')({ component: Home });
