// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** The four outcomes the legacy modal renders, matching `RegisterOutcome['kind']`. */
export type RegisterResultKind = 'created' | 'already-exists' | 'invalid-email' | 'error';

const COPY: Record<RegisterResultKind, { title: string; body: string }> = {
  created: {
    title: 'register_page.modal.success_title',
    body: 'register_page.modal.success_body',
  },
  'already-exists': {
    title: 'register_page.modal.exists_title',
    body: 'register_page.modal.exists_body',
  },
  'invalid-email': {
    title: 'register_page.modal.invalid_email_title',
    body: 'register_page.modal.invalid_email_body',
  },
  error: {
    title: 'register_page.modal.error_title',
    body: 'register_page.modal.error_body',
  },
};

type Props = {
  result: RegisterResultKind | null;
  onClose: () => void;
};

/**
 * Outcome modal, ported from the hand-rolled dialog at the bottom of the legacy page.
 *
 * Two deliberate departures from legacy, both noted in MIGRATION.md:
 *
 * - Legacy sent the user to `/` on success via `window.location.assign`. We navigate to
 *   `/account/login`, which is where they must go once the mailed link is confirmed;
 *   the home page was a dead end that said nothing about what to do next.
 * - Legacy called `window.location.reload()` on *every* failure, discarding everything
 *   the user had typed - painful after a 409, where only one field needs changing.
 *   Closing the dialog now leaves the form intact.
 */
export function RegisterResultDialog({ result, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isSuccess = result === 'created';

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    onClose();
    if (isSuccess) {
      void navigate({ to: '/account/login' });
    }
  };

  return (
    <Dialog open={result !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {isSuccess ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col gap-2 text-left">
              <DialogTitle>{result ? t(COPY[result].title) : ''}</DialogTitle>
              <DialogDescription>{result ? t(COPY[result].body) : ''}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            {isSuccess ? t('words.login') : t('words.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
