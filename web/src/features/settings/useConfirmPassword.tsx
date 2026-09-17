// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useCallback, useRef, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Replaces the native `prompt('Please enter your password to continue')` that legacy
 * calls before all six sensitive actions on this page.
 *
 * The contract is deliberately the same as `prompt()`: await it, get the password or
 * `null` when the user cancels, so every call site keeps the legacy `if (!pw) return;`
 * guard. Only the presentation changes - a focus-trapped dialog instead of a native
 * modal that cannot be styled and that some browsers suppress.
 *
 * The password is held in component state for exactly as long as the dialog is open and
 * cleared on close, so it never reaches storage or a query cache.
 */
export function useConfirmPassword() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  // Kept in a ref so `confirmPassword` stays stable and reopening cannot resolve a
  // previous, already-settled promise.
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const settle = useCallback((value: string | null) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    setPassword('');
    resolve?.(value);
  }, []);

  /** Ask for the password. Resolves to the password, or null if the user cancelled. */
  const confirmPassword = useCallback(() => {
    // A second call while the dialog is open cancels the first, so no promise is left
    // pending forever.
    resolverRef.current?.(null);
    setPassword('');
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const dialog = (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Covers Esc, the close button and an outside click - all mean "cancel".
        if (!next) settle(null);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (password === '') return;
            settle(password);
          }}
        >
          <DialogHeader>
            <DialogTitle asChild>
              <h2 className="font-display">{t('security_settings.confirm_password.title')}</h2>
            </DialogTitle>
            <DialogDescription className="prose-measure">
              {t('security_settings.confirm_password.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="confirm-password">
              {t('security_settings.confirm_password.label')}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="current-password"
              // No autoFocus: Radix moves focus into the dialog and onto the first
              // focusable element, which is this field.
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => settle(null)}>
              {t('words.cancel')}
            </Button>
            <Button type="submit" disabled={password === ''}>
              {t('security_settings.confirm_password.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return { confirmPassword, dialog };
}
