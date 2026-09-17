// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Link } from '@tanstack/react-router';
import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/**
 * Placeholder for routes that exist in the legacy app but have not been ported yet.
 * Each one is replaced by the real route in its migration phase; keeping the paths
 * registered means the app shell's links stay type-checked and navigable.
 */
export function ComingSoon({ route }: { route: string }) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <Construction className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="font-display text-2xl font-semibold">{t('styleguide.not_ported_title')}</h1>
      <p className="prose-measure text-muted-foreground">{t('styleguide.not_ported_body')}</p>
      <code className="rounded-md border bg-muted px-2 py-1 text-sm">{route}</code>
      <Button asChild variant="secondary">
        <Link to="/">{t('words.home')}</Link>
      </Button>
    </div>
  );
}
