// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ArrowLeft, Loader2 } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  onSubmit: (password: string) => void;
  onBack: () => void;
  isPending: boolean;
  /** Set after a 401, so the message sits next to the field rather than in a toast only. */
  errorMessage: string | null;
};

/**
 * Password challenge, ported from `password_component.svelte`.
 *
 * The legacy "Use backup-code" link is intentionally absent here: backup codes arrive
 * with the 2FA PR, and offering a link to a screen that does not exist would be worse
 * than omitting it.
 */
export function PasswordStep({ onSubmit, onBack, isPending, errorMessage }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const fieldId = useId();
  const errorId = useId();
  const isEmpty = password === '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isEmpty || isPending) return;
    onSubmit(password);
  };

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl tracking-tight">
        {t('login_page.password_title')}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>{t('words.password')}</Label>
          <Input
            id={fieldId}
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? errorId : undefined}
          />
          {errorMessage ? (
            <p id={errorId} role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            {t('login_page.back')}
          </Button>
          <Button type="submit" disabled={isEmpty || isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('words.continue')}
          </Button>
        </div>
      </form>
    </div>
  );
}
