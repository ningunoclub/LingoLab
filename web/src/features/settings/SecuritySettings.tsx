// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { startRegistration, WebAuthnError } from '@simplewebauthn/browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { BackupCodeDialog } from './BackupCodeDialog';
import {
  beginKeyRegistration,
  createBackupCode,
  deleteSecurityKey,
  disableTotp,
  enableTotp,
  finishKeyRegistration,
  securityQueries,
  setRequirePassword,
  type TotpSetupData,
} from './securityApi';
import { WrongPasswordError } from './settingsApi';
import { TotpSetupDialog } from './TotpSetupDialog';
import { useConfirmPassword } from './useConfirmPassword';

/** One card's loading, error and retry shell, so the four sections behave alike. */
function SectionState({
  isPending,
  isError,
  onRetry,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  if (isPending) {
    return <Skeleton className="h-11 w-full" />;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{t('security_settings.errors.load_failed')}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          {t('words.retry')}
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * The security page: backup code, TOTP, security keys and the require-password switch.
 *
 * Legacy laid this out as four quadrants in a `grid-rows-2 h-screen` with hard black
 * borders, which breaks below roughly 900px. Here it is a responsive card grid in the
 * Workspace style; the behaviour of all four sections is unchanged.
 *
 * Every mutating call needs the current password. Legacy asked with `prompt()` and
 * reported failure with `alert()`; both are replaced by dialogs and toasts. The
 * `if (!password) return;` guard after each prompt is legacy's, kept deliberately -
 * except that legacy omitted it in `save_password_required`, which is the bug noted in
 * the PR and fixed here to match the other five handlers.
 */
export function SecuritySettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { confirmPassword, dialog: passwordDialog } = useConfirmPassword();

  const [totpData, setTotpData] = useState<TotpSetupData | null>(null);
  const [backupCode, setBackupCode] = useState<string | null>(null);
  const [pendingKeyRemoval, setPendingKeyRemoval] = useState<number | null>(null);
  const [confirmingBackupCode, setConfirmingBackupCode] = useState(false);

  const keys = useQuery(securityQueries.keys);
  const totp = useQuery(securityQueries.totp);

  const totpActivated = totp.data === true;

  // `require_password` is not part of the narrowed SettingsUser, so it has its own query.
  // It only ever matters once TOTP is on.
  const requirePassword = useQuery(securityQueries.requirePassword);

  /**
   * Ask for the password, then run the action. A cancel resolves to null and the action
   * never runs, which is legacy's `if (!pw) return;` guard.
   *
   * `mutateAsync` rethrows after its `onError` has already reported the failure, so the
   * rejection is swallowed here. Without this the toast still appears, but the promise
   * surfaces as an unhandled rejection in the console.
   */
  const withPassword = async (run: (password: string) => Promise<void>) => {
    const password = await confirmPassword();
    if (!password) return;
    try {
      await run(password);
    } catch {
      // Already reported by the mutation's onError.
    }
  };

  /** Every 401 on this page means the same thing, so report it in one place. */
  const reportError = (error: unknown, fallbackKey: string) => {
    if (error instanceof WrongPasswordError) {
      toast.error(t('security_settings.errors.wrong_password'));
      return;
    }
    toast.error(t(fallbackKey));
  };

  const backupCodeMutation = useMutation({
    mutationFn: createBackupCode,
    onSuccess: (code) => setBackupCode(code),
    onError: (error) => reportError(error, 'security_settings.errors.backup_code_failed'),
  });

  const totpMutation = useMutation({
    mutationFn: async ({ password, enable }: { password: string; enable: boolean }) => {
      if (enable) return await enableTotp(password);
      await disableTotp(password);
      return null;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: securityQueries.totp.queryKey });
      // Turning TOTP off also clears the require-password switch's precondition.
      await queryClient.invalidateQueries({ queryKey: securityQueries.requirePassword.queryKey });
      if (data) setTotpData(data);
    },
    onError: (error) => reportError(error, 'security_settings.errors.totp_failed'),
  });

  const addKeyMutation = useMutation({
    mutationFn: async (password: string) => {
      const options = await beginKeyRegistration(password);
      const credential = await startRegistration({ optionsJSON: options });
      await finishKeyRegistration(credential);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: securityQueries.keys.queryKey });
      toast.success(t('security_settings.security_key_added'));
    },
    onError: (error) => {
      // The ceremony fails for ordinary reasons too: the user dismissed the browser
      // prompt, or the key is already registered. Legacy rethrew and showed nothing.
      if (error instanceof WebAuthnError) {
        const key =
          error.name === 'NotAllowedError' || error.name === 'AbortError'
            ? 'security_settings.errors.security_key_cancelled'
            : 'security_settings.errors.security_key_failed';
        toast.error(t(key));
        return;
      }
      reportError(error, 'security_settings.errors.security_key_failed');
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: deleteSecurityKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: securityQueries.keys.queryKey });
      toast.success(t('security_settings.security_key_removed'));
    },
    onError: (error) => reportError(error, 'security_settings.errors.remove_key_failed'),
    onSettled: () => setPendingKeyRemoval(null),
  });

  const requirePasswordMutation = useMutation({
    mutationFn: setRequirePassword,
    onSuccess: (stored) => {
      // Trust what the server stored, not what was requested.
      queryClient.setQueryData(securityQueries.requirePassword.queryKey, stored);
      toast.success(t('security_settings.require_password_saved'));
    },
    onError: (error) => {
      reportError(error, 'security_settings.errors.require_password_failed');
      // The switch is derived from the query, so a failure leaves it where it was.
      void queryClient.invalidateQueries({ queryKey: securityQueries.requirePassword.queryKey });
    },
  });

  const busy =
    backupCodeMutation.isPending ||
    totpMutation.isPending ||
    addKeyMutation.isPending ||
    removeKeyMutation.isPending ||
    requirePasswordMutation.isPending;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">{t('security_settings.page_title')}</h1>
        <p className="prose-measure text-sm text-muted-foreground">
          {t('security_settings.page_hint')}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Backup code */}
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2 className="font-display">{t('security_settings.backup_code')}</h2>
            </CardTitle>
            <CardDescription className="prose-measure">
              {t('security_settings.backup_code_hint')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmingBackupCode(true)}
            >
              {t('security_settings.get_backup_code')}
            </Button>
          </CardContent>
        </Card>

        {/* TOTP */}
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2 className="font-display">{t('security_settings.totp')}</h2>
            </CardTitle>
            <CardDescription className="prose-measure">
              {t('security_settings.totp_hint')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SectionState
              isPending={totp.isPending}
              isError={totp.isError}
              onRetry={() => totp.refetch()}
            >
              <p className="text-sm text-muted-foreground">
                {totpActivated
                  ? t('security_settings.totp_available')
                  : t('security_settings.totp_unavailable')}
              </p>
              <div>
                <Button
                  type="button"
                  variant={totpActivated ? 'outline' : 'secondary'}
                  disabled={busy}
                  onClick={() =>
                    withPassword(async (password) => {
                      await totpMutation.mutateAsync({ password, enable: !totpActivated });
                    })
                  }
                >
                  {totpActivated
                    ? t('security_settings.disable_totp')
                    : t('security_settings.enable_totp')}
                </Button>
              </div>
            </SectionState>
          </CardContent>
        </Card>

        {/* Security keys */}
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2 className="font-display">{t('security_settings.webauthn')}</h2>
            </CardTitle>
            <CardDescription className="prose-measure">
              {t('security_settings.webauthn_hint')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SectionState
              isPending={keys.isPending}
              isError={keys.isError}
              onRetry={() => keys.refetch()}
            >
              <p className="text-sm text-muted-foreground">
                {keys.data && keys.data.length > 0
                  ? t('security_settings.webauthn_available')
                  : t('security_settings.webauthn_unavailable')}
              </p>

              {keys.data && keys.data.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {keys.data.map((key, index) => (
                    <li
                      key={key.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-2"
                    >
                      <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
                      {/*
                        Legacy numbered the keys by position, not by id, and the backend
                        exposes nothing else about them. Kept, so the label matches what
                        the user saw before.
                      */}
                      <span className="flex-1 text-sm">
                        {t('security_settings.security_key_label', { number: index + 1 })}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setPendingKeyRemoval(key.id)}
                      >
                        {/* Icon as well as colour: red alone must not carry the meaning. */}
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                        <span className="text-destructive">
                          {t('security_settings.remove_security_key')}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center">
                  <KeyRound className="size-6 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    {t('security_settings.no_security_keys')}
                  </p>
                </div>
              )}

              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    withPassword(async (password) => {
                      await addKeyMutation.mutateAsync(password);
                    })
                  }
                >
                  {t('security_settings.add_security_key')}
                </Button>
              </div>
            </SectionState>
          </CardContent>
        </Card>

        {/* Require password on login */}
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2 className="font-display">{t('security_settings.activate_2fa')}</h2>
            </CardTitle>
            <CardDescription className="prose-measure">
              {t('security_settings.require_password_hint')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SectionState
              isPending={totp.isPending || requirePassword.isPending}
              isError={totp.isError || requirePassword.isError}
              onRetry={() => {
                void totp.refetch();
                void requirePassword.refetch();
              }}
            >
              <div className="flex items-center gap-3">
                <Switch
                  id="require-password"
                  checked={requirePassword.data === true}
                  // Legacy disabled this whenever TOTP was off, and additionally made the
                  // whole block pointer-events-none and grayscale. Kept as a disabled
                  // control with an explanation, which says the same thing accessibly.
                  disabled={!totpActivated || busy}
                  onCheckedChange={(next) =>
                    withPassword(async (password) => {
                      await requirePasswordMutation.mutateAsync({
                        requirePassword: next,
                        password,
                      });
                    })
                  }
                />
                <Label htmlFor="require-password">
                  {t('security_settings.require_password_label')}
                </Label>
              </div>

              <p className="text-sm text-muted-foreground">
                {!totpActivated
                  ? t('security_settings.require_password_needs_totp')
                  : requirePassword.data === true
                    ? t('security_settings.2fa_activated')
                    : t('security_settings.2fa_deactivated')}
              </p>
            </SectionState>
          </CardContent>
        </Card>
      </div>

      {passwordDialog}

      <TotpSetupDialog totpData={totpData} onClose={() => setTotpData(null)} />
      <BackupCodeDialog backupCode={backupCode} onClose={() => setBackupCode(null)} />

      {/* Regenerating replaces the existing code, so it is confirmed first, as legacy did. */}
      <AlertDialog
        open={confirmingBackupCode}
        onOpenChange={(open) => {
          if (!open) setConfirmingBackupCode(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('security_settings.replace_backup_code_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('security_settings.replace_backup_code_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('words.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingBackupCode(false);
                void withPassword(async (password) => {
                  await backupCodeMutation.mutateAsync(password);
                });
              }}
            >
              {t('security_settings.get_backup_code')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingKeyRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingKeyRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('security_settings.remove_security_key_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('security_settings.remove_security_key_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('words.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const keyId = pendingKeyRemoval;
                setPendingKeyRemoval(null);
                if (keyId === null) return;
                void withPassword(async (password) => {
                  await removeKeyMutation.mutateAsync({ keyId, password });
                });
              }}
            >
              {t('security_settings.remove_security_key')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
