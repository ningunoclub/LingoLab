// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from './passwordResetApi';
import { type RequestResetFormValues, requestResetSchema } from './passwordResetSchema';

/**
 * "Email me a reset link", ported from `account/reset-password/+page.svelte`.
 *
 * Despite the route name this is the *request* half of the flow; `/account/password-reset`
 * is where the mailed link lands. The names are inverted upstream and are kept, because
 * they appear in already-sent emails. See MIGRATION.md.
 *
 * The confirmation is deliberately non-committal ("if an account exists..."). The backend
 * answers 200 for unknown addresses too, so promising that a mail was sent would be a
 * claim we cannot make - and telling the user it was *not* sent would leak which addresses
 * have accounts.
 */
export function RequestResetCard() {
  const { t } = useTranslation();
  const emailId = useId();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<RequestResetFormValues>({
    resolver: zodResolver(requestResetSchema),
    // Legacy disabled the button until the field was non-empty; we hold it until the
    // address actually parses, so a typo fails here rather than as a mail that never comes.
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: requestPasswordReset,
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values.email));

  const emailError = errors.email?.message ? t(errors.email.message) : null;

  // The address is read back from the form rather than from a separate state: the field is
  // untouched after a successful submit, so it still holds exactly what was sent.
  if (mutation.isSuccess) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <h1 className="font-display font-semibold text-xl tracking-tight">
                {t('password_reset_page.request.sent_title')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t('password_reset_page.request.sent_body', { email: getValues('email') })}
              </p>
              <p className="text-muted-foreground text-sm">
                {t('password_reset_page.request.sent_hint')}
              </p>
            </div>
          </div>
          <Button asChild className="mt-2 self-start">
            <Link to="/account/login">{t('words.login')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="p-6">
        <h1 className="font-display font-semibold text-2xl tracking-tight">
          {t('password_reset_page.reset_password')}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {t('password_reset_page.request.description')}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor={emailId}>{t('words.email')}</Label>
            <Input
              id={emailId}
              type="email"
              autoComplete="email"
              aria-invalid={emailError !== null}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              {...register('email')}
            />
            {emailError ? (
              <p id={`${emailId}-error`} role="alert" className="text-destructive text-sm">
                {emailError}
              </p>
            ) : null}
          </div>

          {/* A transport failure, not a rejected address - the backend never rejects one. */}
          {mutation.isError ? (
            <p role="alert" className="text-destructive text-sm">
              {t('password_reset_page.set.error_body')}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <Link
              to="/account/login"
              className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
            >
              {t('register_page.already_have_account?')}
            </Link>
            <Button type="submit" disabled={!isValid || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {t('password_reset_page.request.submit')}
            </Button>
          </div>
        </form>

        <p className="mt-6 border-t pt-4 text-center text-muted-foreground text-sm">
          {t('login_page.already_have_account')}{' '}
          <Link
            to="/account/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('words.register')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
