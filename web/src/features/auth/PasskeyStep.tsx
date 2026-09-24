// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type Props = {
  onStart: () => void;
  onBack: () => void;
  onUseBackupCode: () => void;
  isPending: boolean;
  errorMessage: string | null;
};

/**
 * Passkey challenge, ported from `webauthn_component.svelte`.
 *
 * Like legacy, the ceremony starts on a click rather than automatically: Safari only
 * shows the WebAuthn prompt in response to a user gesture.
 */
export function PasskeyStep({ onStart, onBack, onUseBackupCode, isPending, errorMessage }: Props) {
  const { t } = useTranslation();
  const errorId = useId();

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl tracking-tight">
        {t('login_page.passkey_title')}
      </h1>
      <p className="mt-2 text-muted-foreground text-sm">{t('login_page.passkey_hint')}</p>

      <div className="mt-6 flex flex-col gap-4">
        <Button
          type="button"
          size="lg"
          onClick={onStart}
          disabled={isPending}
          aria-describedby={errorMessage ? errorId : undefined}
        >
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound aria-hidden="true" />
          )}
          {t('words.start')}
        </Button>
        {errorMessage ? (
          <p id={errorId} role="alert" className="text-destructive text-sm">
            {errorMessage}
          </p>
        ) : null}
        <Button type="button" variant="link" className="self-start px-0" onClick={onUseBackupCode}>
          {t('login_page.use_backup_code')}
        </Button>

        <div>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            {t('login_page.back')}
          </Button>
        </div>
      </div>
    </div>
  );
}
