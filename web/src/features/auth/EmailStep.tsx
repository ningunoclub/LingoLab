// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthBlock } from './OAuthBlock';

type Props = {
  onSubmit: (email: string) => void;
  isPending: boolean;
};

/**
 * Step 0, ported from `start_window.svelte`: identify the account.
 *
 * The field accepts an email address *or* a username, so it is a text input, not
 * `type="email"` - the browser must not reject a bare username as malformed.
 */
export function EmailStep({ onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const fieldId = useId();
  const isEmpty = email.trim() === '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmpty || isPending) return;
    onSubmit(email.trim());
  };

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl tracking-tight">
        {t('login_page.welcome_back')}
      </h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {t('login_page.login_or_create_account')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>{t('login_page.email_or_username')}</Label>
          <Input
            id={fieldId}
            name="email"
            type="text"
            autoComplete="username"
            // Autofocus: this field is the sole purpose of the route.
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Link
            to="/account/password-reset"
            className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('register_page.forgot_password?')}
          </Link>
          <Button type="submit" disabled={isEmpty || isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('words.continue')}
          </Button>
        </div>
      </form>

      <OAuthBlock />

      <p className="mt-6 border-t pt-4 text-center text-muted-foreground text-sm">
        {t('login_page.already_have_account')}{' '}
        <Link
          to="/account/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('words.register')}
        </Link>
      </p>
    </div>
  );
}
