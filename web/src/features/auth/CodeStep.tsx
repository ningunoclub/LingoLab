// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ArrowLeft, Loader2 } from 'lucide-react';
import { type FormEvent, type HTMLAttributes, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  title: string;
  hint: string;
  label: string;
  /** Legacy enables Continue only at the exact length: 6 for TOTP, 64 for backup codes. */
  length: number;
  inputMode: HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete: string;
  onSubmit: (code: string) => void;
  onBack: () => void;
  /** Shown as a "Use backup-code" link when set (legacy offers it from the TOTP screen). */
  onUseBackupCode?: () => void;
  isPending: boolean;
  /** Set after a 401. The field is cleared at the same time, as legacy did for TOTP. */
  errorMessage: string | null;
};

/**
 * One-code challenge, ported from `totp_component.svelte` and `backup_component.svelte`.
 * The two legacy components differ only in their label, the expected length and the
 * step they post to, which the caller decides.
 *
 * Surrounding whitespace is ignored: backup codes are pasted from a downloaded file,
 * where a trailing newline would otherwise keep Continue disabled with no explanation.
 */
export function CodeStep({
  title,
  hint,
  label,
  length,
  inputMode,
  autoComplete,
  onSubmit,
  onBack,
  onUseBackupCode,
  isPending,
  errorMessage,
}: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [lastError, setLastError] = useState(errorMessage);
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();

  // A new rejection clears the field so the next attempt starts empty.
  if (errorMessage !== lastError) {
    setLastError(errorMessage);
    if (errorMessage) setCode('');
  }

  const trimmed = code.trim();
  const isValid = trimmed.length === length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || isPending) return;
    onSubmit(trimmed);
  };

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl tracking-tight">{title}</h1>
      <p id={hintId} className="mt-2 text-muted-foreground text-sm">
        {hint}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>{label}</Label>
          <Input
            id={fieldId}
            name="code"
            type="text"
            inputMode={inputMode}
            autoComplete={autoComplete}
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="font-mono tabular-nums"
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? `${hintId} ${errorId}` : hintId}
          />
          {errorMessage ? (
            <p id={errorId} role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          {onUseBackupCode ? (
            <Button
              type="button"
              variant="link"
              className="self-start px-0"
              onClick={onUseBackupCode}
            >
              {t('login_page.use_backup_code')}
            </Button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            {t('login_page.back')}
          </Button>
          <Button type="submit" disabled={!isValid || isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('words.continue')}
          </Button>
        </div>
      </form>
    </div>
  );
}
