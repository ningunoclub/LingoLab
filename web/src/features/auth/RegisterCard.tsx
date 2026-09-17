// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RegisterResultDialog, type RegisterResultKind } from './RegisterResultDialog';
import { registerUser } from './registerApi';
import { type RegisterFormValues, registerSchema } from './registerSchema';

/**
 * The registration form, ported from `account/register/+page.svelte`.
 *
 * Legacy used felte + yup with a tippy reporter, which rendered errors in floating
 * tooltips. Here they are inline text tied to the field with `aria-describedby`, so they
 * survive zoom, screen readers and touch - tooltips are the one legacy UI pattern not
 * reproduced verbatim.
 */
export function RegisterCard() {
  const { t } = useTranslation();
  const [result, setResult] = useState<RegisterResultKind | null>(null);
  const ids = {
    email: useId(),
    username: useId(),
    password1: useId(),
    password2: useId(),
    privacy: useId(),
    tos: useId(),
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Legacy's submit button is disabled until the form validates, which needs the
    // whole form checked as the user types, not only on submit.
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (outcome) => setResult(outcome.kind),
    // registerUser resolves for every expected rejection, so this is a transport failure.
    onError: () => setResult('error'),
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      email: values.email,
      username: values.username,
      password: values.password1,
    });
  });

  const isBusy = mutation.isPending;
  const privacyAccepted = watch('privacy_accept') ?? false;
  const tosAccepted = watch('tos_accept') ?? false;

  /** Inline error text, or null. Messages are i18n keys (see registerSchema). */
  const errorFor = (field: keyof RegisterFormValues): string | null => {
    const message = errors[field]?.message;
    return message ? t(message) : null;
  };

  const fields = [
    {
      name: 'email' as const,
      id: ids.email,
      type: 'email',
      label: t('words.email'),
      autoComplete: 'email',
    },
    {
      name: 'username' as const,
      id: ids.username,
      type: 'text',
      label: t('words.username'),
      autoComplete: 'username',
    },
    {
      name: 'password1' as const,
      id: ids.password1,
      type: 'password',
      label: t('words.password'),
      autoComplete: 'new-password',
      // react-hook-form tracks errors per field, so editing the first password would not
      // clear or raise the "passwords do not match" error sitting on the second one.
      deps: ['password2' as const],
    },
    {
      name: 'password2' as const,
      id: ids.password2,
      type: 'password',
      label: t('words.repeat_password'),
      autoComplete: 'new-password',
      deps: ['password1' as const],
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <Card>
        <CardContent className="p-6">
          <h1 className="font-display font-semibold text-2xl tracking-tight">
            {t('register_page.greeting')}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">{t('register_page.create_account')}</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            {fields.map((field) => {
              const error = errorFor(field.name);
              return (
                <div key={field.name} className="flex flex-col gap-2">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <Input
                    id={field.id}
                    type={field.type}
                    autoComplete={field.autoComplete}
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

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={ids.privacy}
                  checked={privacyAccepted}
                  onCheckedChange={(checked) =>
                    setValue('privacy_accept', checked === true, { shouldValidate: true })
                  }
                  aria-describedby={errorFor('privacy_accept') ? `${ids.privacy}-error` : undefined}
                />
                <Label htmlFor={ids.privacy} className="block font-normal text-sm leading-snug">
                  <Trans
                    i18nKey="register_page.consent_privacy"
                    components={[
                      <Link
                        key="privacy"
                        to="/docs/privacy-policy"
                        className="text-primary underline underline-offset-4"
                      />,
                    ]}
                  />
                </Label>
              </div>
              {errorFor('privacy_accept') ? (
                <p id={`${ids.privacy}-error`} role="alert" className="text-destructive text-sm">
                  {errorFor('privacy_accept')}
                </p>
              ) : null}

              <div className="flex items-start gap-3">
                <Checkbox
                  id={ids.tos}
                  checked={tosAccepted}
                  onCheckedChange={(checked) =>
                    setValue('tos_accept', checked === true, { shouldValidate: true })
                  }
                  aria-describedby={errorFor('tos_accept') ? `${ids.tos}-error` : undefined}
                />
                <Label htmlFor={ids.tos} className="block font-normal text-sm leading-snug">
                  <Trans
                    i18nKey="register_page.consent_tos"
                    components={[
                      <Link
                        key="tos"
                        to="/docs/tos"
                        className="text-primary underline underline-offset-4"
                      />,
                    ]}
                  />
                </Label>
              </div>
              {errorFor('tos_accept') ? (
                <p id={`${ids.tos}-error`} role="alert" className="text-destructive text-sm">
                  {errorFor('tos_accept')}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4">
              <Link
                to="/account/reset-password"
                className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
              >
                {t('register_page.forgot_password?')}
              </Link>
              <Button type="submit" disabled={!isValid || isBusy}>
                {isBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                {t('words.register')}
              </Button>
            </div>
          </form>

          <p className="mt-6 border-t pt-4 text-center text-muted-foreground text-sm">
            {t('register_page.already_have_account?')}{' '}
            <Link
              to="/account/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('words.login')}
            </Link>
          </p>
        </CardContent>
      </Card>

      <RegisterResultDialog result={result} onClose={() => setResult(null)} />
    </div>
  );
}
