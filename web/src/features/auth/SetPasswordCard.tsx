// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from './passwordResetApi';
import { type ResetPasswordFormValues, resetPasswordSchema } from './passwordResetSchema';

/**
 * A dead end that explains itself: no usable token, so there is no form to show.
 * Used for both a missing `?token` and one the backend rejected.
 */
function TokenProblem({ title, body }: { title: string; body: string }) {
  const { t } = useTranslation();

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-semibold text-xl tracking-tight">{title}</h1>
            <p className="text-muted-foreground text-sm">{body}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link to="/account/reset-password">
              {t('password_reset_page.set.request_new_link')}
            </Link>
          </Button>
          <Link
            to="/account/login"
            className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('register_page.already_have_account?')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

type Props = {
  /** The `?token` search param. `null` when the link was truncated or hand-typed. */
  token: string | null;
};

/**
 * "Choose a new password", ported from `account/password-reset/+page.svelte` - the page the
 * link in the reset mail opens (`forgotten_password.jinja2` points here with `?token=`).
 *
 * **This route is broken upstream.** Legacy line 12 reads `let { token: string } = data`,
 * which is a destructuring *rename*: it binds the token to a local called `string` and
 * leaves `token` undefined where the request body is built, so every submission goes out as
 * `{password, token: undefined}` and comes back 400. The intent is not in doubt - the
 * server loader exists only to read `?token` - so the port wires it through properly rather
 * than reproducing a route that cannot work. Recorded in MIGRATION.md.
 *
 * The missing-token state is likewise new. Legacy rendered the form regardless and failed on
 * submit, but only ever reached that path *because* of the bug above.
 */
export function SetPasswordCard({ token }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ids = { password1: useId(), password2: useId() };

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    // Legacy gated its button on a `$derived` over both fields, so validity has to track
    // typing rather than waiting for submit.
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (outcome) => {
      if (outcome.kind !== 'reset') return;
      // The backend cleared the auth cookies and signed every session out, so there is no
      // client state left to invalidate - go straight to login, as legacy did.
      toast.success(t('password_reset_page.set.done_title'), {
        description: t('password_reset_page.set.done_body'),
      });
      void navigate({ to: '/account/login' });
    },
  });

  if (!token) {
    return (
      <TokenProblem
        title={t('password_reset_page.set.missing_token_title')}
        body={t('password_reset_page.set.missing_token_body')}
      />
    );
  }

  // A rejected token cannot be retried, so the form is replaced rather than annotated.
  if (mutation.data?.kind === 'invalid-token') {
    return (
      <TokenProblem
        title={t('password_reset_page.set.invalid_token_title')}
        body={t('password_reset_page.set.invalid_token_body')}
      />
    );
  }

  const onSubmit = handleSubmit((values) => mutation.mutate({ password: values.password1, token }));

  const errorFor = (field: keyof ResetPasswordFormValues): string | null => {
    const message = errors[field]?.message;
    return message ? t(message) : null;
  };

  const fields = [
    {
      name: 'password1' as const,
      id: ids.password1,
      label: t('words.password'),
      // react-hook-form tracks errors per field, so editing the first password would not
      // refresh the "passwords do not match" error sitting on the second one.
      deps: ['password2' as const],
    },
    {
      name: 'password2' as const,
      id: ids.password2,
      label: t('words.repeat_password'),
      deps: ['password1' as const],
    },
  ];

  // Everything except a rejected token: a transport failure or an unexpected status.
  const failed = mutation.isError || mutation.data?.kind === 'error';

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="p-6">
        <h1 className="font-display font-semibold text-2xl tracking-tight">
          {t('password_reset_page.reset_password')}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {t('password_reset_page.set.description')}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          {/*
            Password managers refuse to file a new password without a username to attach it
            to, and warn about it in the console. We cannot supply one: the page knows only
            the reset token, and no endpoint maps a token back to an account - by design,
            since that would let anyone holding a token learn the address it belongs to.
            An empty hidden field is enough for the browser to offer an *update* to the
            saved entry for this origin instead of creating an orphan, and invents nothing.
          */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            defaultValue=""
            readOnly
            hidden
            aria-hidden="true"
            tabIndex={-1}
          />
          {fields.map((field) => {
            const error = errorFor(field.name);
            return (
              <div key={field.name} className="flex flex-col gap-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={error !== null}
                  aria-describedby={error ? `${field.id}-error` : undefined}
                  {...register(field.name, { deps: field.deps })}
                />
                {error ? (
                  <p id={`${field.id}-error`} role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                ) : null}
              </div>
            );
          })}

          <p className="text-muted-foreground text-sm">
            {t('password_reset_page.set.signed_out_notice')}
          </p>

          {failed ? (
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
              {t('password_reset_page.set.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
