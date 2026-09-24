// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { startAuthentication, WebAuthnError } from '@simplewebauthn/browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { currentUserQuery } from '@/auth/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeStep } from './CodeStep';
import { EmailStep } from './EmailStep';
import { type AuthMethod, startLogin, submitLoginStep, WrongCredentialsError } from './loginApi';
import { MethodStep } from './MethodStep';
import { PasskeyStep } from './PasskeyStep';
import { PasswordStep } from './PasswordStep';
import { useLoginFlow } from './useLoginFlow';

type Props = {
  /** Where to go once the cookie is set. */
  returnTo: string;
  /** Shows the "email confirmed" badge (legacy `?verified`). */
  verified: boolean;
};

/** What a method screen hands over: the factor and, for code/password screens, its value. */
type Factor = { method: Exclude<AuthMethod, 'PASSKEY'>; value: string } | { method: 'PASSKEY' };

/** Message shown next to the field when the backend rejects a factor. */
const REJECTED_KEY: Record<AuthMethod, string> = {
  PASSWORD: 'login_page.wrong_credentials_help',
  TOTP: 'login_page.totp_wrong',
  BACKUP: 'login_page.backup_wrong',
  PASSKEY: 'login_page.passkey_failed',
};

/**
 * The login state machine, ported from `account/login/+page.svelte`.
 *
 * Legacy finished by calling `window.location.reload()` and letting the server layout
 * redirect. Here the session cookie is already set by the time the request resolves, so
 * invalidating the cached identity and navigating is enough - no full page reload.
 */
export function LoginCard({ returnTo, verified }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const flow = useLoginFlow();
  const [stepError, setStepError] = useState<string | null>(null);
  /**
   * The backup-code screen sits on top of whichever screen linked to it, so Back
   * returns there instead of to the email form.
   */
  const [showBackup, setShowBackup] = useState(false);

  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: currentUserQuery.queryKey });
    await navigate({ to: returnTo });
  };

  const unexpectedError = () => {
    toast.error(t('login_page.modal.error.unexpected'), {
      description: t('login_page.modal.error.description.unexpected'),
    });
  };

  const startMutation = useMutation({
    mutationFn: startLogin,
    onSuccess: flow.beginSession,
    onError: unexpectedError,
  });

  const stepMutation = useMutation({
    mutationFn: async (factor: Factor) => {
      const session = flow.session;
      if (!session) throw new Error('No login session');
      let data: string | object;
      if (factor.method === 'PASSKEY') {
        if (!session.webauthn_data) throw new Error('No WebAuthn options in session');
        // Legacy fell through to the POST with `data: undefined` when the ceremony
        // failed. Here a failed ceremony throws before anything is sent.
        data = await startAuthentication({ optionsJSON: JSON.parse(session.webauthn_data) });
      } else {
        data = factor.value;
      }
      return submitLoginStep({
        sessionId: session.session_id,
        // The backend accepts BACKUP at step 1 for any session, whatever step we are on
        // (legacy hardcodes 1 too). Every other factor goes to the current step.
        step: factor.method === 'BACKUP' || flow.step !== 2 ? 1 : 2,
        authType: factor.method,
        data,
      });
    },
    onMutate: () => setStepError(null),
    onSuccess: async (outcome) => {
      if (outcome.kind === 'signed-in') {
        await finish();
        return;
      }
      setShowBackup(false);
      flow.advanceToSecondFactor();
    },
    onError: (error, factor) => {
      if (error instanceof WebAuthnError) {
        // Dismissing the browser prompt is an ordinary choice, not a failure.
        const cancelled = error.name === 'NotAllowedError' || error.name === 'AbortError';
        toast.error(t(cancelled ? 'login_page.passkey_cancelled' : 'login_page.passkey_failed'));
        return;
      }
      if (error instanceof WrongCredentialsError) {
        // For PASSWORD this is deliberately identical whether or not the account exists:
        // the backend hands out a decoy session for unknown users so login cannot be used
        // to enumerate accounts.
        setStepError(t(REJECTED_KEY[factor.method]));
        if (factor.method === 'PASSWORD') {
          toast.error(t('login_page.modal.error.wrong_creds'), {
            description: t('login_page.modal.error.description.wrong_creds'),
          });
        }
        return;
      }
      unexpectedError();
    },
  });

  const submit = (factor: Factor) => stepMutation.mutate(factor);

  const openBackup = () => {
    setStepError(null);
    setShowBackup(true);
  };

  const closeBackup = () => {
    setStepError(null);
    setShowBackup(false);
  };

  const handleBack = () => {
    setStepError(null);
    setShowBackup(false);
    flow.reset();
  };

  const common = {
    onBack: handleBack,
    onUseBackupCode: openBackup,
    isPending: stepMutation.isPending,
    errorMessage: stepError,
  };

  const renderStep = () => {
    if (flow.step === 0) {
      return (
        <EmailStep
          onSubmit={(email) => startMutation.mutate(email)}
          isPending={startMutation.isPending}
        />
      );
    }
    if (showBackup) {
      return (
        <CodeStep
          key="BACKUP"
          title={t('login_page.backup_title')}
          hint={t('login_page.backup_hint')}
          label={t('words.backup_code')}
          length={64}
          inputMode="text"
          autoComplete="off"
          onSubmit={(value) => submit({ method: 'BACKUP', value })}
          onBack={closeBackup}
          isPending={stepMutation.isPending}
          errorMessage={stepError}
        />
      );
    }
    if (flow.hasUnsupportedOnly) {
      return (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-sm">
            {t('login_page.passkey_unsupported')}
          </p>
          <Button type="button" variant="link" className="self-start px-0" onClick={openBackup}>
            {t('login_page.use_backup_code')}
          </Button>
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft aria-hidden="true" />
              {t('login_page.back')}
            </Button>
          </div>
        </div>
      );
    }
    switch (flow.selectedMethod) {
      case null:
        return <MethodStep methods={flow.availableMethods} onSelect={flow.selectMethod} />;
      case 'PASSWORD':
        return (
          <PasswordStep {...common} onSubmit={(value) => submit({ method: 'PASSWORD', value })} />
        );
      case 'TOTP':
        return (
          <CodeStep
            {...common}
            key="TOTP"
            title={t('login_page.totp_title')}
            hint={t('login_page.totp_hint')}
            label={t('words.totp')}
            length={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            onSubmit={(value) => submit({ method: 'TOTP', value })}
          />
        );
      case 'PASSKEY':
        return <PasskeyStep {...common} onStart={() => submit({ method: 'PASSKEY' })} />;
      case 'BACKUP':
        // Never offered by the backend in step_1/step_2; reached through `showBackup`.
        return null;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {verified ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm"
        >
          <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {t('login_page.verified_badge')}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}
