// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { currentUserQuery } from '@/auth/auth';
import { Card, CardContent } from '@/components/ui/card';
import { EmailStep } from './EmailStep';
import { startLogin, submitLoginStep, WrongCredentialsError } from './loginApi';
import { MethodStep } from './MethodStep';
import { PasswordStep } from './PasswordStep';
import { useLoginFlow } from './useLoginFlow';

type Props = {
  /** Where to go once the cookie is set. */
  returnTo: string;
  /** Shows the "email confirmed" badge (legacy `?verified`). */
  verified: boolean;
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
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: currentUserQuery.queryKey });
    await navigate({ to: returnTo });
  };

  const startMutation = useMutation({
    mutationFn: startLogin,
    onSuccess: flow.beginSession,
    onError: () => {
      toast.error(t('login_page.modal.error.unexpected'), {
        description: t('login_page.modal.error.description.unexpected'),
      });
    },
  });

  const stepMutation = useMutation({
    mutationFn: (password: string) => {
      if (!flow.session) throw new Error('No login session');
      return submitLoginStep({
        sessionId: flow.session.session_id,
        step: flow.step === 2 ? 2 : 1,
        authType: 'PASSWORD',
        data: password,
      });
    },
    onSuccess: async (outcome) => {
      setPasswordError(null);
      if (outcome.kind === 'signed-in') {
        await finish();
      } else {
        flow.advanceToSecondFactor();
      }
    },
    onError: (error) => {
      if (error instanceof WrongCredentialsError) {
        // Deliberately identical whether or not the account exists: the backend hands
        // out a decoy session for unknown users so login cannot be used to enumerate.
        setPasswordError(t('login_page.wrong_credentials_help'));
        toast.error(t('login_page.modal.error.wrong_creds'), {
          description: t('login_page.modal.error.description.wrong_creds'),
        });
        return;
      }
      toast.error(t('login_page.modal.error.unexpected'), {
        description: t('login_page.modal.error.description.unexpected'),
      });
    },
  });

  const handleBack = () => {
    setPasswordError(null);
    flow.reset();
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
        <CardContent className="p-6">
          {flow.step === 0 ? (
            <EmailStep
              onSubmit={(email) => startMutation.mutate(email)}
              isPending={startMutation.isPending}
            />
          ) : flow.hasUnsupportedOnly ? (
            <div className="flex flex-col gap-4">
              <p role="alert" className="text-sm">
                {t('login_page.unsupported_method')}
              </p>
              <button
                type="button"
                onClick={handleBack}
                className="self-start text-primary text-sm underline-offset-4 hover:underline"
              >
                {t('login_page.back')}
              </button>
            </div>
          ) : flow.selectedMethod === null ? (
            <MethodStep methods={flow.availableMethods} onSelect={flow.selectMethod} />
          ) : (
            <PasswordStep
              onSubmit={(password) => stepMutation.mutate(password)}
              onBack={handleBack}
              isPending={stepMutation.isPending}
              errorMessage={passwordError}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
