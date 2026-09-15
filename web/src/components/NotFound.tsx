// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// Replaces the legacy +error.svelte 404 branch.
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-primary" data-numeric>
        404
      </p>
      <h1 className="font-display text-2xl font-semibold">{t('words.error')}</h1>
      <p className="prose-measure text-muted-foreground">{t('error_page.404_text')}</p>
      <Button asChild>
        <Link to="/">{t('words.home')}</Link>
      </Button>
    </div>
  );
}
