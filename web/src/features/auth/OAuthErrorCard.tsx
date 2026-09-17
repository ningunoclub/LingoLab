// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

/**
 * Why the sign-in attempt failed. `email` is GitHub answering without an address
 * (usually because none is verified); `generic` covers a failed token exchange.
 */
export type OAuthErrorReason = 'email' | 'generic';

/**
 * Shown after the backend bounces a failed GitHub sign-in back to the frontend.
 *
 * Both cases are the user's dead end, so each one names the thing they can actually do
 * about it rather than only stating that something went wrong.
 */
export function OAuthErrorCard({ reason }: { reason: OAuthErrorReason }) {
  const { t } = useTranslation();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {/* CardHeader is a grid, so the badge is centred with mx-auto rather than items-center. */}
        <span
          className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10"
          aria-hidden="true"
        >
          <AlertTriangle className="size-6 text-destructive" />
        </span>
        {/*
          shadcn's CardTitle renders a <div>. This card is the entire page, so the title
          has to be a real <h1> or the page has no heading for screen readers at all.
        */}
        <h1 className="font-display text-2xl leading-none font-semibold">
          {t('oauth_error_page.title')}
        </h1>
        <CardDescription className="prose-measure">
          {reason === 'email'
            ? t('oauth_error_page.email_body')
            : t('oauth_error_page.generic_body')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link to="/account/login">{t('oauth_error_page.back_to_login')}</Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('oauth_error_page.persists')}
        </p>
      </CardContent>
    </Card>
  );
}
